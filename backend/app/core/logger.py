"""
Quotely Logger - Thread-safe Singleton Logging System

Features:
- AppLogger: Application-wide logging (misc/logger/app/)
- UserLogger: User/Agency-specific logging (misc/logger/user/{user_id}/)
- Thread-safe singleton pattern
- Daily rotating log files
- Structured log format with timestamps

Usage:
    from app.core.logger import getLogger, getUserLogger

    # App-level logging
    logger = getLogger()
    logger.info("Application started")

    # User-specific logging
    user_logger = getUserLogger(user_id=5)
    user_logger.info("User created quotation")
"""

import os
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict
from logging.handlers import RotatingFileHandler


# Base path for logs
LOG_BASE_PATH = Path(__file__).parent.parent.parent / "misc" / "logger"
LOG_APP_PATH = LOG_BASE_PATH / "app"
LOG_USER_PATH = LOG_BASE_PATH / "user"

# Log format
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Log file settings
MAX_LOG_SIZE = 5 * 1024 * 1024  # 5 MB
BACKUP_COUNT = 5  # Keep 5 backup files


class ClsAppLogger:
    """
    Singleton App Logger - Single instance for entire application
    Thread-safe implementation
    """

    _instance: Optional['ClsAppLogger'] = None
    _lock: threading.Lock = threading.Lock()
    _logger: Optional[logging.Logger] = None

    def __new__(cls):
        """Thread-safe singleton creation"""
        if cls._instance is None:
            with cls._lock:
                # Double-check locking pattern
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def fnInitialize(self) -> logging.Logger:
        """Initialize app logger (called once)"""

        if ClsAppLogger._logger is not None:
            return ClsAppLogger._logger

        with ClsAppLogger._lock:
            if ClsAppLogger._logger is not None:
                return ClsAppLogger._logger

            # Ensure directory exists
            LOG_APP_PATH.mkdir(parents=True, exist_ok=True)

            # Create logger
            logger = logging.getLogger("quotely.app")
            logger.setLevel(logging.DEBUG)

            # Prevent duplicate handlers
            if logger.handlers:
                return logger

            # File handler - Rotating
            strLogFile = LOG_APP_PATH / f"app_{datetime.now().strftime('%Y-%m-%d')}.log"
            fileHandler = RotatingFileHandler(
                strLogFile,
                maxBytes=MAX_LOG_SIZE,
                backupCount=BACKUP_COUNT,
                encoding="utf-8"
            )
            fileHandler.setLevel(logging.DEBUG)
            fileHandler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))

            # Console handler
            consoleHandler = logging.StreamHandler()
            consoleHandler.setLevel(logging.INFO)
            consoleHandler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))

            logger.addHandler(fileHandler)
            logger.addHandler(consoleHandler)

            ClsAppLogger._logger = logger
            logger.info("=== App Logger Initialized ===")

            return logger

    def fnGetLogger(self) -> logging.Logger:
        """Get the app logger instance"""
        if ClsAppLogger._logger is None:
            return self.fnInitialize()
        return ClsAppLogger._logger


class ClsUserLoggerManager:
    """
    User Logger Manager - Manages per-user logger instances
    Thread-safe with lazy initialization
    """

    _instance: Optional['ClsUserLoggerManager'] = None
    _lock: threading.Lock = threading.Lock()
    _user_loggers: Dict[int, logging.Logger] = {}
    _user_locks: Dict[int, threading.Lock] = {}

    def __new__(cls):
        """Thread-safe singleton creation"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def _fnGetUserLock(self, intUserId: int) -> threading.Lock:
        """Get or create lock for specific user"""
        if intUserId not in ClsUserLoggerManager._user_locks:
            with ClsUserLoggerManager._lock:
                if intUserId not in ClsUserLoggerManager._user_locks:
                    ClsUserLoggerManager._user_locks[intUserId] = threading.Lock()
        return ClsUserLoggerManager._user_locks[intUserId]

    def fnGetUserLogger(self, intUserId: int) -> logging.Logger:
        """
        Get or create logger for specific user

        Args:
            intUserId: User ID (pk_bint_user_id)

        Returns:
            logging.Logger configured for that user
        """

        # Fast path - logger already exists
        if intUserId in ClsUserLoggerManager._user_loggers:
            return ClsUserLoggerManager._user_loggers[intUserId]

        # Slow path - create new logger with user-specific lock
        userLock = self._fnGetUserLock(intUserId)

        with userLock:
            # Double-check after acquiring lock
            if intUserId in ClsUserLoggerManager._user_loggers:
                return ClsUserLoggerManager._user_loggers[intUserId]

            # Create user log directory
            strUserLogPath = LOG_USER_PATH / str(intUserId)
            strUserLogPath.mkdir(parents=True, exist_ok=True)

            # Create logger with unique name
            strLoggerName = f"quotely.user.{intUserId}"
            logger = logging.getLogger(strLoggerName)
            logger.setLevel(logging.DEBUG)

            # Prevent duplicate handlers
            if not logger.handlers:
                # File handler - User specific
                strLogFile = strUserLogPath / f"user_{datetime.now().strftime('%Y-%m-%d')}.log"
                fileHandler = RotatingFileHandler(
                    strLogFile,
                    maxBytes=MAX_LOG_SIZE,
                    backupCount=BACKUP_COUNT,
                    encoding="utf-8"
                )
                fileHandler.setLevel(logging.DEBUG)
                fileHandler.setFormatter(logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT))

                logger.addHandler(fileHandler)

            # Don't propagate to root logger (avoid duplicate console output)
            logger.propagate = False

            ClsUserLoggerManager._user_loggers[intUserId] = logger
            logger.info(f"=== User Logger Initialized for User ID: {intUserId} ===")

            return logger

    def fnCloseUserLogger(self, intUserId: int) -> None:
        """Close and remove a user's logger (for cleanup)"""
        if intUserId in ClsUserLoggerManager._user_loggers:
            userLock = self._fnGetUserLock(intUserId)
            with userLock:
                if intUserId in ClsUserLoggerManager._user_loggers:
                    logger = ClsUserLoggerManager._user_loggers[intUserId]
                    for handler in logger.handlers[:]:
                        handler.close()
                        logger.removeHandler(handler)
                    del ClsUserLoggerManager._user_loggers[intUserId]


# =============================================================================
# Public API - Simple helper functions
# =============================================================================

def getLogger() -> logging.Logger:
    """
    Get application-wide logger

    Usage:
        from app.core.logger import getLogger

        logger = getLogger()
        logger.info("Server started")
        logger.error("Something went wrong", exc_info=True)

    Returns:
        logging.Logger: App logger instance
    """
    return ClsAppLogger().fnGetLogger()


def getUserLogger(intUserId: int) -> logging.Logger:
    """
    Get user-specific logger

    Usage:
        from app.core.logger import getUserLogger

        logger = getUserLogger(user_id)
        logger.info("User created quotation #123")
        logger.warning("User exceeded quota")

    Args:
        intUserId: User ID (from JWT or session)

    Returns:
        logging.Logger: User-specific logger instance
    """
    return ClsUserLoggerManager().fnGetUserLogger(intUserId)


def closeUserLogger(intUserId: int) -> None:
    """
    Close user logger (call when user session ends or for cleanup)

    Args:
        intUserId: User ID
    """
    ClsUserLoggerManager().fnCloseUserLogger(intUserId)


# =============================================================================
# Convenience logging functions (optional shortcuts)
# =============================================================================

def logInfo(strMessage: str, intUserId: Optional[int] = None) -> None:
    """Quick info log to app or user logger"""
    if intUserId:
        getUserLogger(intUserId).info(strMessage)
    else:
        getLogger().info(strMessage)


def logError(strMessage: str, intUserId: Optional[int] = None, exc_info: bool = False) -> None:
    """Quick error log to app or user logger"""
    if intUserId:
        getUserLogger(intUserId).error(strMessage, exc_info=exc_info)
    else:
        getLogger().error(strMessage, exc_info=exc_info)


def logWarning(strMessage: str, intUserId: Optional[int] = None) -> None:
    """Quick warning log to app or user logger"""
    if intUserId:
        getUserLogger(intUserId).warning(strMessage)
    else:
        getLogger().warning(strMessage)


def logDebug(strMessage: str, intUserId: Optional[int] = None) -> None:
    """Quick debug log to app or user logger"""
    if intUserId:
        getUserLogger(intUserId).debug(strMessage)
    else:
        getLogger().debug(strMessage)
