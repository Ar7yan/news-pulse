# =============================================================================
# connection.py — PostgreSQL Connection Pool
# =============================================================================
# WHY A CONNECTION POOL?
# Opening a new database connection is expensive (~100ms).
# A pool keeps connections open and reuses them.
# psycopg2's ThreadedConnectionPool handles this for us.
#
# USAGE in other files:
#   from database.connection import get_connection, release_connection
#
#   conn = get_connection()
#   try:
#       # use conn...
#   finally:
#       release_connection(conn)  # ALWAYS release back to pool
# =============================================================================

import psycopg2
from psycopg2 import pool, extras
from typing import Optional

from config.settings import DATABASE_URL
from utils.logger import get_logger

logger = get_logger(__name__)

# -----------------------------------------------------------------------------
# Global connection pool
# minconn=1 — always keep at least 1 connection open
# maxconn=5  — never open more than 5 at once (free tier limit)
# -----------------------------------------------------------------------------
_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def init_pool() -> None:
    """
    Initialize the connection pool.
    Call this ONCE when the scraper starts (in main.py).
    """
    global _connection_pool

    if _connection_pool is not None:
        logger.debug("Connection pool already initialized")
        return

    try:
        logger.info("Initializing database connection pool...")

        _connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            dsn=DATABASE_URL,
            # Return dicts instead of tuples when fetching rows
            cursor_factory=extras.RealDictCursor
        )

        # Test the connection immediately
        conn = _connection_pool.getconn()
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()
            logger.info(f"Connected to PostgreSQL: {version['version'][:50]}...")
        _connection_pool.putconn(conn)

        logger.info("Database connection pool ready")

    except psycopg2.OperationalError as e:
        logger.error(f"Failed to connect to database: {e}")
        logger.error("Check your DATABASE_URL in scraper/.env")
        raise


def get_connection():
    """
    Get a connection from the pool.

    IMPORTANT: Always pair with release_connection() in a finally block.
    Or better yet, use the get_db_cursor() context manager below.

    Returns:
        psycopg2 connection object
    """
    global _connection_pool

    if _connection_pool is None:
        raise RuntimeError(
            "Connection pool not initialized. "
            "Call init_pool() before get_connection()."
        )

    try:
        conn = _connection_pool.getconn()
        return conn
    except pool.PoolError as e:
        logger.error(f"Could not get connection from pool: {e}")
        raise


def release_connection(conn) -> None:
    """
    Return a connection back to the pool.
    Always call this after you're done with a connection.

    Args:
        conn: Connection object obtained from get_connection()
    """
    global _connection_pool

    if _connection_pool and conn:
        _connection_pool.putconn(conn)


def close_pool() -> None:
    """
    Close all connections in the pool.
    Call this when the scraper finishes (in main.py cleanup).
    """
    global _connection_pool

    if _connection_pool:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")


# -----------------------------------------------------------------------------
# Context Manager — the RECOMMENDED way to use the database
# -----------------------------------------------------------------------------
class get_db_cursor:
    """
    Context manager for safe database operations.

    Automatically:
    - Gets a connection from the pool
    - Creates a cursor
    - Commits on success
    - Rolls back on error
    - Returns connection to pool when done

    Usage:
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM articles")
            rows = cur.fetchall()
        # Connection automatically returned to pool here

        # For write operations:
        with get_db_cursor(commit=True) as cur:
            cur.execute("INSERT INTO articles ...")
    """

    def __init__(self, commit: bool = False):
        self.commit = commit
        self.conn   = None
        self.cursor = None

    def __enter__(self):
        self.conn   = get_connection()
        self.cursor = self.conn.cursor()
        return self.cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # An exception occurred — roll back changes
            logger.debug(f"Rolling back transaction due to: {exc_val}")
            self.conn.rollback()
        elif self.commit:
            # Success and commit requested — save changes
            self.conn.commit()

        # Always close cursor and return connection to pool
        if self.cursor:
            self.cursor.close()
        if self.conn:
            release_connection(self.conn)

        # Return False to propagate exceptions
        return False