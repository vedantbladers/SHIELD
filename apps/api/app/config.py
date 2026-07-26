from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://shield:shieldpass@localhost:5432/shield_marketplace"
    mongodb_uri: str = ""
    mongodb_db_name: str = "cybersec_marketplace"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7
    gmail_user: str = ""
    gmail_app_password: str = ""
    app_url: str = "http://localhost:5173"
    internal_secret: str = ""
    huggingface_api_key: str = ""
    moderator_email: str = "mod@shield.local"
    moderator_password: str = "ShieldMod2026!Secure"

    class Config:
        env_file = ".env"


settings = Settings()
