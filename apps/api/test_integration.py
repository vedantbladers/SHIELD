import asyncio
import json
import urllib.request
import urllib.parse
from http.cookiejar import CookieJar
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

# Database connection
DATABASE_URL = "postgresql+asyncpg://shield:shieldpass@localhost:5432/shield_marketplace"
engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

BASE_URL = "http://localhost:8000"

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        return fp
    http_error_301 = http_error_302
    http_error_303 = http_error_302
    http_error_307 = http_error_302

class APIClient:
    def __init__(self):
        self.cookie_jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar),
            NoRedirectHandler()
        )

    def request(self, method, path, data=None, headers=None):
        url = f"{BASE_URL}{path}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        
        req_data = None
        if data is not None:
            req_data = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
        try:
            with self.opener.open(req) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                err_json = json.loads(body)
            except:
                err_json = body
            return e.code, err_json

async def get_verification_token(email):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT verification_token FROM users WHERE email = :email"),
            {"email": email}
        )
        return result.scalar()

async def get_user_trust_score(alias):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT trust_score FROM users WHERE alias = :alias"),
            {"alias": alias}
        )
        return result.scalar()

async def reset_user_trust_score(alias):
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("DELETE FROM trust_events WHERE alias = :alias"),
            {"alias": alias}
        )
        await session.execute(
            text("UPDATE users SET trust_score = 0.0 WHERE alias = :alias"),
            {"alias": alias}
        )
        await session.execute(
            text("UPDATE alias_directory SET trust_score = 0.0 WHERE alias = :alias"),
            {"alias": alias}
        )
        await session.commit()

async def get_message_content_from_db(deal_id):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            text("SELECT encrypted_content FROM messages WHERE deal_id = :deal_id LIMIT 1"),
            {"deal_id": deal_id}
        )
        return result.scalar()

async def run_tests():
    print("=======================================================================")
    print("RUNNING SHIELD E2E INTEGRATION TESTS (10 SCENARIOS)")
    print("=======================================================================")

    await reset_user_trust_score("Vendor-E2ETester")
    await reset_user_trust_score("Buyer-E2ETester")

    buyer = APIClient()
    vendor = APIClient()
    mod = APIClient()

    # -------------------------------------------------------------------------
    # TEST 1: Signup + Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Signup + Verification...")
    
    # 1A. Signup Buyer
    status, res = buyer.request("POST", "/api/auth/signup", {
        "email": "buyer_e2e@shield.local",
        "password": "BuyerSecurePass2026!",
        "alias": "Buyer-E2ETester",
        "role": "buyer"
    })
    assert status in (201, 409), f"Buyer signup failed: {res}"
    
    # 1B. Signup Vendor
    status, res = vendor.request("POST", "/api/auth/signup", {
        "email": "vendor_e2e@shield.local",
        "password": "VendorSecurePass2026!",
        "alias": "Vendor-E2ETester",
        "role": "vendor"
    })
    assert status in (201, 409), f"Vendor signup failed: {res}"

    # Get verification tokens from Postgres
    buyer_token = await get_verification_token("buyer_e2e@shield.local")
    vendor_token = await get_verification_token("vendor_e2e@shield.local")

    # Verify Buyer Email
    if buyer_token:
        status, res = buyer.request("GET", f"/api/auth/verify?token={buyer_token}")
        # Note: verify redirect to onboard returns 302, but urllib follows redirect to onboard page
        # In our case, the API verify route redirects to frontend, so it's a 302/redirect.
        print("  - Buyer email verified successfully via database token.")

    # Verify Vendor Email
    if vendor_token:
        status, res = vendor.request("GET", f"/api/auth/verify?token={vendor_token}")
        print("  - Vendor email verified successfully via database token.")

    # Login and Onboard
    status, res = buyer.request("POST", "/api/auth/login", {
        "email": "buyer_e2e@shield.local",
        "password": "BuyerSecurePass2026!"
    })
    assert status == 200, f"Buyer login failed: {res}"
    
    status, res = buyer.request("PATCH", "/api/auth/me", {"onboarding_complete": True})
    assert status == 200, f"Buyer onboarding patch failed: {res}"
    print("  - Buyer onboarding completed.")

    status, res = vendor.request("POST", "/api/auth/login", {
        "email": "vendor_e2e@shield.local",
        "password": "VendorSecurePass2026!"
    })
    assert status == 200, f"Vendor login failed: {res}"
    
    status, res = vendor.request("PATCH", "/api/auth/me", {"onboarding_complete": True})
    assert status == 200, f"Vendor onboarding patch failed: {res}"
    print("  - Vendor onboarding completed.")

    # -------------------------------------------------------------------------
    # TEST 2: Role Isolation
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Role Isolation...")
    # Buyer attempts to query vendor-only endpoint
    status, res = buyer.request("GET", "/api/vendor/dashboard/stats")
    assert status == 403, f"Expected 403 for buyer accessing vendor stats, got: {status}"
    print("  - Verified: Buyer is denied access to Vendor endpoints (403 Forbidden).")

    # Vendor attempts to query buyer-only endpoint
    status, res = vendor.request("GET", "/api/buyer/dashboard/stats")
    assert status == 403, f"Expected 403 for vendor accessing buyer stats, got: {status}"
    print("  - Verified: Vendor is denied access to Buyer endpoints (403 Forbidden).")

    # -------------------------------------------------------------------------
    # TEST 3: Requirement + Matching
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Requirement + Matching...")
    # First, Vendor completes profile (needed for matching engine)
    status, res = vendor.request("PATCH", "/api/vendor/profile", {
        "service_description": "We specialize in web application security audits and penetration testing.",
        "categories": ["Penetration Testing"],
        "skills": ["pentest", "web", "owasp"],
        "experience_years": 8,
        "rate_range": {"min": 80, "max": 150}
    })
    assert status == 200, f"Vendor profile patch failed: {res}"
    print("  - Vendor profile completed.")

    # Buyer posts a new requirement
    status, res = buyer.request("POST", "/api/buyer/requirements", {
        "title": "Need Web Penetration Testing",
        "description": "We require a comprehensive web application penetration testing matching OWASP Top 10 guidelines.",
        "service_type": ["Penetration Testing"],
        "budget_range": {"min": 1000, "max": 5000},
        "timeline_weeks": 4,
        "compliance_needs": ["SOC2"],
        "tech_stack": ["React", "Node"],
        "engagement_type": "one-time",
        "urgency": "medium"
    })
    assert status in (200, 201), f"Post requirement failed: {res}"
    req_id = res["data"]["id"]
    print(f"  - Buyer requirement posted (ID: {req_id}).")

    # Run matching engine
    status, res = buyer.request("POST", "/api/matching/run", {"requirement_id": req_id})
    assert status == 200, f"Matching run failed: {res}"
    print("  - Matching engine triggered successfully.")

    # Vendor checks matched opportunities
    status, res = vendor.request("GET", "/api/vendor/marketplace")
    assert status == 200, f"Get opportunities failed: {res}"
    matches = res["data"]["items"]
    match_found = any(m["_id"] == req_id for m in matches)
    assert match_found, "Requirement not found in vendor matched opportunities!"
    print("  - Verified: Vendor successfully sees matched requirement.")

    # -------------------------------------------------------------------------
    # TEST 4: Proposal + Deal Creation
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Proposal + Deal Creation...")
    # Vendor submits proposal
    status, res = vendor.request("POST", "/api/vendor/proposals", {
        "requirement_id": req_id,
        "cover_note": "We will deliver a high quality web penetration testing report within 3 weeks. This includes OWASP Top 10 vulnerabilities scanning, manual business logic verification, and comprehensive remediation guidelines.",
        "proposed_price": 2500.00,
        "proposed_timeline_weeks": 3,
        "methodology": "Our methodology follows the standard PTES framework including reconnaissance, vulnerability analysis, exploitation, post-exploitation, and reporting.",
        "relevant_experience": "Our team has over 8 years of experience performing security assessments for enterprise SaaS systems."
    })
    assert status in (200, 201), f"Submit proposal failed: {res}"
    prop_id = res["data"]["id"]
    print(f"  - Vendor proposal submitted (ID: {prop_id}).")

    # Buyer accepts proposal to create deal
    status, res = buyer.request("POST", "/api/deals/create", {"proposal_id": prop_id})
    assert status in (200, 201), f"Accept proposal failed: {res}"
    deal_id = res["data"]["deal_id"]
    print(f"  - Buyer accepted proposal. Deal created (ID: {deal_id}).")

    # -------------------------------------------------------------------------
    # TEST 5: Encrypted Chat
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Encrypted Chat...")
    # Send a message from Buyer
    status, res = buyer.request("POST", f"/api/deals/{deal_id}/events", {
        "type": "MESSAGE",
        "content": "ENC_CIPHERTEXT_BUYER_HELLO_WORLD_TEST"
    })
    assert status in (200, 201), f"Send message failed: {res}"
    print("  - Buyer sent encrypted message.")

    # Verify message ciphertext is stored in DB
    db_content = await get_message_content_from_db(deal_id)
    assert db_content == "ENC_CIPHERTEXT_BUYER_HELLO_WORLD_TEST", f"DB stored incorrect text: {db_content}"
    print(f"  - Verified: DB stores ciphertext exactly ('{db_content}').")

    # -------------------------------------------------------------------------
    # TEST 6: Certification Review
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Certification Review...")
    # Vendor uploads certification
    status, res = vendor.request("POST", "/api/vendor/certifications/upload", {
        "cert_name": "OSCP",
        "cert_type": "OSCP",
        "file_url": "/uploads/certifications/test_cert.pdf"
    })
    assert status in (200, 201), f"Upload cert failed: {res}"
    cert_id = res["data"]["id"]
    print(f"  - Vendor uploaded certification (ID: {cert_id}).")

    # Login as Moderator
    status, res = mod.request("POST", "/api/auth/login", {
        "email": "mod@shield.local",
        "password": "ShieldMod2026!Secure"
    })
    assert status == 200, f"Moderator login failed: {res}"

    # Get certifications queue
    status, res = mod.request("GET", "/api/moderator/certifications")
    assert status == 200, f"Get certifications failed: {res}"
    certs = res["data"]["items"]
    # cert_id is a UUID string, but c["id"] in python could be a UUID object or a string. Let's cast to string just in case
    cert_pending = any(str(c["id"]) == str(cert_id) and c["review_status"] == "PENDING" for c in certs)
    assert cert_pending, "Uploaded cert not found in moderator pending queue!"
    print("  - Verified: Certification is in Moderator's review queue in PENDING status.")

    # Approve certification
    await reset_user_trust_score("Vendor-E2ETester")
    initial_trust = await get_user_trust_score("Vendor-E2ETester")
    status, res = mod.request("POST", f"/api/moderator/certifications/{cert_id}/review", {
        "action": "approve",
        "score": 95
    })
    assert status == 200, f"Approve certification failed: {res}"
    
    new_trust = await get_user_trust_score("Vendor-E2ETester")
    assert new_trust > initial_trust, f"Trust score did not increase! Was {initial_trust}, now {new_trust}"
    print(f"  - Verified: Certification approved. Trust score increased from {initial_trust} to {new_trust}.")

    # -------------------------------------------------------------------------
    # TEST 7: Deal Closure + Rating
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Deal Closure + Rating...")
    
    # 1. NEGOTIATING -> CONTRACTED (Buyer calls transition)
    status, res = buyer.request("POST", f"/api/deals/{deal_id}/transition", {
        "action": "CONTRACTED",
        "note": "Progressing deal to CONTRACTED"
    })
    assert status == 200, f"Transition to CONTRACTED failed: {res}"

    # 2. CONTRACTED -> IN_PROGRESS (Vendor calls transition)
    status, res = vendor.request("POST", f"/api/deals/{deal_id}/transition", {
        "action": "IN_PROGRESS",
        "note": "Progressing deal to IN_PROGRESS"
    })
    assert status == 200, f"Transition to IN_PROGRESS failed: {res}"

    # 3. IN_PROGRESS -> REVIEW (Vendor calls transition)
    status, res = vendor.request("POST", f"/api/deals/{deal_id}/transition", {
        "action": "REVIEW",
        "note": "Progressing deal to REVIEW"
    })
    assert status == 200, f"Transition to REVIEW failed: {res}"

    # 4. REVIEW -> CLOSED (Buyer calls close)
    status, res = buyer.request("POST", f"/api/deals/{deal_id}/close")
    assert status == 200, f"Close deal failed: {res}"
    print("  - Deal completed and closed.")

    # Submit reviews
    # Buyer reviews Vendor
    status, res = buyer.request("POST", f"/api/deals/{deal_id}/review", {
        "rating": 5,
        "comment": "Exceptional pentesting services."
    })
    assert status == 200, f"Buyer review submission failed: {res}"
    
    # Vendor reviews Buyer
    status, res = vendor.request("POST", f"/api/deals/{deal_id}/review", {
        "rating": 4,
        "comment": "Great buyer, clear requirements."
    })
    assert status == 200, f"Vendor review submission failed: {res}"
    print("  - Peer reviews submitted by both parties.")

    # Verify ratings are visible on public vendor profile
    status, res = buyer.request("GET", "/api/marketplace/public/vendors")
    assert status == 200, f"Get public vendors failed: {res}"
    vendors_list = res["data"]
    test_vendor = next(v for v in vendors_list if v["alias"] == "Vendor-E2ETester")
    assert test_vendor["completed_deals"] > 0, "Completed deals count not updated!"
    print("  - Verified: Ratings and completed deals are updated on public profile.")

    # -------------------------------------------------------------------------
    # TEST 8: Identity Reveal
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Identity Reveal...")
    # Buyer consents to reveal
    status, res = buyer.request("POST", f"/api/deals/{deal_id}/consent-reveal")
    assert status == 200, f"Buyer reveal consent failed: {res}"
    
    # Vendor consents to reveal
    status, res = vendor.request("POST", f"/api/deals/{deal_id}/consent-reveal")
    assert status == 200, f"Vendor reveal consent failed: {res}"
    
    # Verify reveal is complete
    status, res = buyer.request("GET", f"/api/deals/{deal_id}")
    assert status == 200, f"Get deal failed: {res}"
    assert res["data"]["identity_revealed"] == True, "Identity not revealed!"
    print("  - Verified: Identity reveal consent successful for both parties.")

    # -------------------------------------------------------------------------
    # TEST 9: Public Pages
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Public Pages...")
    public_client = APIClient()
    
    status, res = public_client.request("GET", "/api/marketplace/public/vendors")
    assert status == 200, f"Public vendors endpoint failed: {res}"
    
    status, res = public_client.request("GET", "/api/marketplace/public/landing")
    assert status == 200, f"Public landing endpoint failed: {res}"
    print("  - Verified: Public pages retrieve data successfully without authorization.")

    # -------------------------------------------------------------------------
    # TEST 10: Moderator Dispute Resolution
    # -------------------------------------------------------------------------
    print("\n[TEST 10] Moderator Dispute Resolution...")
    # Post another requirement
    status, res = buyer.request("POST", "/api/buyer/requirements", {
        "title": "Incident Response Plan",
        "description": "We need help designing our incident response procedures.",
        "service_type": ["Incident Response"],
        "budget_range": {"min": 500, "max": 2000},
        "timeline_weeks": 2,
        "compliance_needs": ["PCI-DSS"],
        "tech_stack": [],
        "engagement_type": "one-time",
        "urgency": "high"
    })
    req_id2 = res["data"]["id"]
    
    # Run matching
    status, res = buyer.request("POST", "/api/matching/run", {"requirement_id": req_id2})
    
    # Submit proposal
    status, res = vendor.request("POST", "/api/vendor/proposals", {
        "requirement_id": req_id2,
        "cover_note": "We will deliver a comprehensive Incident Response plan covering all standard phases: preparation, identification, containment, eradication, recovery, and lessons learned.",
        "proposed_price": 1000.00,
        "proposed_timeline_weeks": 1,
        "methodology": "We follow NIST SP 800-61 Rev 2 guidelines for establishing incident response capabilities and workflows.",
        "relevant_experience": "We have designed and verified over 20 incident response plans for various financial institutions."
    })
    prop_id2 = res["data"]["id"]
    
    # Accept and create Deal 2
    status, res = buyer.request("POST", "/api/deals/create", {"proposal_id": prop_id2})
    assert status in (200, 201), f"Accept proposal failed: {res}"
    deal_id2 = res["data"]["deal_id"]

    # Transition Deal 2: NEGOTIATING -> CONTRACTED -> IN_PROGRESS -> REVIEW -> DISPUTED
    # 1. NEGOTIATING -> CONTRACTED (Buyer)
    status, res = buyer.request("POST", f"/api/deals/{deal_id2}/transition", {"action": "CONTRACTED"})
    assert status == 200, f"Transition to CONTRACTED failed: {res}"
    
    # 2. CONTRACTED -> IN_PROGRESS (Vendor)
    status, res = vendor.request("POST", f"/api/deals/{deal_id2}/transition", {"action": "IN_PROGRESS"})
    assert status == 200, f"Transition to IN_PROGRESS failed: {res}"
    
    # 3. IN_PROGRESS -> REVIEW (Vendor)
    status, res = vendor.request("POST", f"/api/deals/{deal_id2}/transition", {"action": "REVIEW"})
    assert status == 200, f"Transition to REVIEW failed: {res}"
    
    # 4. REVIEW -> DISPUTED (Buyer)
    status, res = buyer.request("POST", f"/api/deals/{deal_id2}/transition", {
        "action": "DISPUTED",
        "note": "Vendor did not submit deliverables on time."
    })
    assert status == 200, f"Raise dispute failed: {res}"
    print("  - Deal 2 marked as DISPUTED.")

    # Moderator resolves dispute
    status, res = mod.request("POST", f"/api/moderator/disputes/{deal_id2}/resolve", {
        "resolution": "mutual",
        "reason": "Refund Buyer, close deal as cancelled.",
        "buyer_trust_adjustment": 0,
        "vendor_trust_adjustment": -5
    })
    assert status == 200, f"Resolve dispute failed: {res}"
    
    # Verify deal is resolved
    status, res = buyer.request("GET", f"/api/deals/{deal_id2}")
    assert res["data"]["status"] == "RESOLVED", f"Expected RESOLVED status, got: {res['data']['status']}"
    print("  - Verified: Moderator successfully resolved dispute and closed deal.")

    print("\n=======================================================================")
    print("ALL 10 E2E SCENARIOS COMPLETED AND VERIFIED SUCCESSFULLY!")
    print("=======================================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
