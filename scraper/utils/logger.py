# =============================================================================
# logger.py — Centralized Logging Setup
# =============================================================================
# Every Python file imports logger from here.
# This gives us consistent, formatted log output across the entire pipeline.
#
# Usage in other files:
#   from utils.logger import get_logger
#   logger = get_logger(__name__)
#   logger.info("Starting scraper...")
#   logger.error("Failed to fetch article", exc_info=True)
# =============================================================================

import logging
import os
import sys
from datetime import datetime

# Import settings carefully — handle if settings fails to load
try:
    from config.settings import LOG_LEVEL, LOG_TO_FILE, LOG_FILE_PATH
except Exception:
    LOG_LEVEL     = "INFO"
    LOG_TO_FILE   = False
    LOG_FILE_PATH = "logs/scraper.log"


# -----------------------------------------------------------------------------
# Custom Formatter — adds color to console output
# Makes it easy to spot errors vs info messages at a glance
# -----------------------------------------------------------------------------
class ColorFormatter(logging.Formatter):
    """Adds colors to log levels in terminal output."""

    # ANSI color codes
    COLORS = {
        "DEBUG"   : "\033[36m",   # Cyan
        "INFO"    : "\033[32m",   # Green
        "WARNING" : "\033[33m",   # Yellow
        "ERROR"   : "\033[31m",   # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    RESET = "\033[0m"

    def format(self, record):
        # Add color to the level name
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname:8}{self.RESET}"
        return super().format(record)


# -----------------------------------------------------------------------------
# Setup Function — called once when the app starts
# -----------------------------------------------------------------------------
def setup_logging():
    """
    Configure the root logger with console (and optionally file) handlers.
    Call this ONCE at the start of main.py.
    """

    # Convert string level to logging constant (e.g. "INFO" -> logging.INFO)
    numeric_level = getattr(logging, LOG_LEVEL, logging.INFO)

    # Format: [2024-01-15 10:30:45] INFO     scraper.feed_parser — Fetching BBC feed
    fmt = "[%(asctime)s] %(levelname)s %(name)s — %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    # --- Console Handler (always on) ---
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(ColorFormatter(fmt, datefmt=date_fmt))

    handlers = [console_handler]

    # --- File Handler (optional) ---
    if LOG_TO_FILE:
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(LOG_FILE_PATH)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

        file_handler = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
        file_handler.setLevel(numeric_level)

        # File logs don't need colors
        file_handler.setFormatter(
            logging.Formatter(fmt, datefmt=date_fmt)
        )
        handlers.append(file_handler)

    # Apply to root logger
    logging.basicConfig(
        level=numeric_level,
        handlers=handlers,
        force=True   # Override any existing config
    )

    # Silence noisy third-party libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("trafilatura").setLevel(logging.WARNING)
    logging.getLogger("newspaper").setLevel(logging.WARNING)
    logging.getLogger("feedparser").setLevel(logging.WARNING)


# -----------------------------------------------------------------------------
# get_logger — imported by every other module
# -----------------------------------------------------------------------------
def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger for a module.

    Usage:
        logger = get_logger(__name__)
        logger.info("Hello from this module")

    Args:
        name: Usually pass __name__ so logs show the module path

    Returns:
        A configured Logger instance
    """
    return logging.getLogger(name)