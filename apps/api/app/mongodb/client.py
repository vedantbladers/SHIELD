import motor.motor_asyncio
from app.config import settings

_client = None


def get_mongo_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.mongodb_uri,
            maxPoolSize=10,
            minPoolSize=2,
            maxIdleTimeMS=60000,
            connectTimeoutMS=5000,
            socketTimeoutMS=15000,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_mongo_db():
    client = get_mongo_client()
    return client[settings.mongodb_db_name]


async def get_collection(name: str):
    db = get_mongo_db()
    return db[name]
