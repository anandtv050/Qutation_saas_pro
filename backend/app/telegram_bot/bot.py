"""Quotely Telegram bot — /recent and /pdf, read-only.

Runs inside the FastAPI process via the lifespan in app/main.py.
Long-polling — works with a single uvicorn worker. With --workers 2+,
Telegram will return "Conflict: terminated by other getUpdates" because
each worker tries to poll. In that case, switch to a separate process or
webhook mode.
"""
from __future__ import annotations

import os
from io import BytesIO
from typing import Optional

from fastapi import HTTPException
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from app.api.login.schema import MdlLoginRequest
from app.api.login.service import ClsLoginService
from app.api.pdf.schema import MdlQuotationPDFRequest
from app.api.pdf.service import ClsPdfGenerator
from app.api.quotation.service import ClsQuotationService
from app.core.database import ClsDatabasepool
from app.core.logger import getLogger
from app.telegram_bot import sessions

logger = getLogger()

WELCOME = (
    "Quotely on Telegram.\n\n"
    "Commands:\n"
    "/login <email> <password> — sign in (your message is deleted right after)\n"
    "/recent — last 10 quotations\n"
    "/pdf <quotation-number-or-id> — fetch the PDF\n"
    "/logout — sign out\n"
    "/help — show this message"
)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

async def _fnGetPool():
    return await ClsDatabasepool().fnGetPool()


async def _fnRequireUserId(update: Update) -> Optional[int]:
    dctSession = sessions.fnGetSession(update.effective_user.id)
    if not dctSession:
        await update.message.reply_text(
            "You're not logged in.\nUse: /login <email> <password>"
        )
        return None
    return dctSession["intUserId"]


async def _fnSendQuotationPdf(ctx: ContextTypes.DEFAULT_TYPE, intChatId: int,
                              intUserId: int, intQuotationId: int,
                              strFileName: str) -> None:
    objPool = await _fnGetPool()
    insPdf = ClsPdfGenerator(objPool, intUserId)
    objResult = await insPdf.fnGetQuotationPdf(
        MdlQuotationPDFRequest(intQuotationId=intQuotationId)
    )

    # PDF service returns a dict on error, StreamingResponse on success
    if isinstance(objResult, dict):
        raise RuntimeError(objResult.get("error", "PDF generation failed"))

    objBuffer = BytesIO()
    objBody = objResult.body_iterator
    if hasattr(objBody, "__aiter__"):
        async for chunk in objBody:
            objBuffer.write(chunk if isinstance(chunk, bytes) else chunk.encode())
    else:
        for chunk in objBody:
            objBuffer.write(chunk if isinstance(chunk, bytes) else chunk.encode())
    objBuffer.seek(0)

    await ctx.bot.send_document(
        chat_id=intChatId,
        document=objBuffer,
        filename=strFileName,
    )


# ─────────────────────────────────────────────
# Command handlers
# ─────────────────────────────────────────────

async def fnCmdStart(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(WELCOME)


async def fnCmdHelp(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(WELCOME)


async def fnCmdLogin(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    objMessage = update.message
    intChatId = update.effective_chat.id
    intTelegramId = update.effective_user.id

    lstArgs = ctx.args or []
    if len(lstArgs) < 2:
        await objMessage.reply_text("Usage: /login <email> <password>")
        return

    strEmail = lstArgs[0]
    strPassword = " ".join(lstArgs[1:])

    # Wipe the password from the chat ASAP. Track the result so we can be
    # honest with the user instead of claiming deletion that didn't happen.
    blnDeleted = False
    try:
        await objMessage.delete()
        blnDeleted = True
    except Exception as e:
        logger.warning(f"Telegram bot: could not delete /login message: {e}")

    strDeleteNote = (
        "Your login message was deleted for security."
        if blnDeleted
        else "⚠️ I couldn't auto-delete your login message — please long-press it and delete manually so your password isn't visible."
    )

    objPool = await _fnGetPool()
    if objPool is None:
        await ctx.bot.send_message(intChatId, f"Server warming up — try again in a moment.\n\n{strDeleteNote}")
        return

    insLogin = ClsLoginService(objPool)
    try:
        objResp = await insLogin.fnLoginService(
            MdlLoginRequest(email=strEmail, password=strPassword)
        )
    except HTTPException as e:
        await ctx.bot.send_message(intChatId, f"Login failed: {e.detail}\n\n{strDeleteNote}")
        return
    except Exception as e:
        logger.exception("Telegram bot: login error")
        await ctx.bot.send_message(intChatId, f"Login failed: {e}\n\n{strDeleteNote}")
        return

    intUserId = objResp.dctUserInfo["intUserId"]
    try:
        sessions.fnSetSession(intTelegramId, intUserId, strEmail)
    except Exception as e:
        logger.exception("Telegram bot: failed to persist session")
        await ctx.bot.send_message(
            intChatId,
            f"Logged in, but couldn't save your session — you may need to /login again on next command. ({e})\n\n{strDeleteNote}",
        )
        return

    logger.info(f"Telegram bot: user {intUserId} ({strEmail}) logged in via tg:{intTelegramId}")
    await ctx.bot.send_message(
        intChatId,
        f" Logged in as {strEmail}.\n{strDeleteNote}",
    )


async def fnCmdLogout(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    sessions.fnClearSession(update.effective_user.id)
    await update.message.reply_text("Logged out.")


async def fnCmdRecent(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    intUserId = await _fnRequireUserId(update)
    if intUserId is None:
        return

    objPool = await _fnGetPool()
    insQuotation = ClsQuotationService(objPool, intUserId)
    try:
        objResp = await insQuotation.fnGetAllQuotationList()
    except Exception as e:
        logger.exception("Telegram bot: /recent fetch failed")
        await update.message.reply_text(f"Couldn't fetch quotations: {e}")
        return
    lstItems = (objResp.lstQuotation or [])[:10]

    if not lstItems:
        await update.message.reply_text("No quotations yet.")
        return

    lstLines = ["Recent quotations:"]
    lstKeyboard = []
    for q in lstItems:
        lstLines.append(
            f"{q.strQuotationNumber} · {q.strCustomerName} · "
            f"₹{q.dblTotalAmount:,.0f} · {q.strStatus}"
        )
        lstKeyboard.append([
            InlineKeyboardButton(
                f"📄 {q.strQuotationNumber}",
                callback_data=f"pdf:{q.intPkQuotationId}",
            )
        ])

    await update.message.reply_text(
        "\n".join(lstLines),
        reply_markup=InlineKeyboardMarkup(lstKeyboard),
    )


async def fnCmdPdf(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    intUserId = await _fnRequireUserId(update)
    if intUserId is None:
        return

    lstArgs = ctx.args or []
    if not lstArgs:
        await update.message.reply_text(
            "Usage: /pdf <quotation-number-or-id>\n"
            "E.g. /pdf QT-2025-0042  or  /pdf 42"
        )
        return

    strArg = lstArgs[0].strip()
    objPool = await _fnGetPool()
    insQuotation = ClsQuotationService(objPool, intUserId)

    intQuotationId: Optional[int] = None
    strQuotationNumber: Optional[str] = None

    if strArg.isdigit():
        intQuotationId = int(strArg)
    else:
        try:
            objListResp = await insQuotation.fnGetAllQuotationList()
        except Exception as e:
            logger.exception("Telegram bot: /pdf list-fetch failed")
            await update.message.reply_text(f"Couldn't search quotations: {e}")
            return
        for q in objListResp.lstQuotation or []:
            if q.strQuotationNumber.lower() == strArg.lower():
                intQuotationId = q.intPkQuotationId
                strQuotationNumber = q.strQuotationNumber
                break
        if intQuotationId is None:
            await update.message.reply_text(f"Couldn't find quotation '{strArg}'.")
            return

    if strQuotationNumber is None:
        try:
            objGetResp = await insQuotation.fnGetSingleQuotationDetails(intQuotationId)
        except Exception as e:
            logger.exception("Telegram bot: /pdf detail-fetch failed")
            await update.message.reply_text(f"Couldn't fetch quotation: {e}")
            return
        if objGetResp.data:
            strQuotationNumber = objGetResp.data.strQuotationNumber
        else:
            await update.message.reply_text(f"Quotation '{strArg}' not found.")
            return

    await update.message.reply_text(f"Fetching PDF for {strQuotationNumber}...")
    try:
        await _fnSendQuotationPdf(
            ctx=ctx,
            intChatId=update.effective_chat.id,
            intUserId=intUserId,
            intQuotationId=intQuotationId,
            strFileName=f"{strQuotationNumber}.pdf",
        )
    except Exception as e:
        logger.exception("pdf fetch failed")
        await update.message.reply_text(f"Couldn't get PDF: {e}")


async def fnOnCallback(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    objQuery = update.callback_query
    await objQuery.answer()
    if not objQuery.data or not objQuery.data.startswith("pdf:"):
        return

    dctSession = sessions.fnGetSession(objQuery.from_user.id)
    if not dctSession:
        await objQuery.message.reply_text("Session expired — /login again.")
        return
    intUserId = dctSession["intUserId"]

    try:
        intQuotationId = int(objQuery.data.split(":", 1)[1])
    except ValueError:
        return

    objPool = await _fnGetPool()
    insQuotation = ClsQuotationService(objPool, intUserId)
    objGetResp = await insQuotation.fnGetSingleQuotationDetails(intQuotationId)
    strQuotationNumber = (
        objGetResp.data.strQuotationNumber
        if objGetResp.data
        else f"quotation-{intQuotationId}"
    )

    try:
        await _fnSendQuotationPdf(
            ctx=ctx,
            intChatId=objQuery.message.chat.id,
            intUserId=intUserId,
            intQuotationId=intQuotationId,
            strFileName=f"{strQuotationNumber}.pdf",
        )
    except Exception as e:
        logger.exception("pdf fetch (callback) failed")
        await objQuery.message.reply_text(f"Couldn't get PDF: {e}")


# ─────────────────────────────────────────────
# Lifecycle (FastAPI lifespan owns the loop, so manual init/start/stop)
# ─────────────────────────────────────────────

_objApp: Optional[Application] = None


def _fnBuildApp(strToken: str) -> Application:
    objApp = Application.builder().token(strToken).build()
    objApp.add_handler(CommandHandler("start", fnCmdStart))
    objApp.add_handler(CommandHandler("help", fnCmdHelp))
    objApp.add_handler(CommandHandler("login", fnCmdLogin))
    objApp.add_handler(CommandHandler("logout", fnCmdLogout))
    objApp.add_handler(CommandHandler("recent", fnCmdRecent))
    objApp.add_handler(CommandHandler("pdf", fnCmdPdf))
    objApp.add_handler(CallbackQueryHandler(fnOnCallback))
    return objApp


async def fnStartBot() -> None:
    global _objApp
    strToken = (os.getenv("TELEGRAM_BOT_TOKEN") or "").strip()
    if not strToken:
        logger.info("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled.")
        return
    _objApp = _fnBuildApp(strToken)
    await _objApp.initialize()
    await _objApp.start()
    await _objApp.updater.start_polling()
    logger.info("Telegram bot started.")


async def fnStopBot() -> None:
    global _objApp
    if _objApp is None:
        return
    try:
        await _objApp.updater.stop()
        await _objApp.stop()
        await _objApp.shutdown()
    finally:
        _objApp = None
    logger.info("Telegram bot stopped.")
