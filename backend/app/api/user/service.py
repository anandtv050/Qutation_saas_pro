from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.core.security import fnHashPassword, ADMIN_USER_ID
from app.api.user.schema import (
    MdlCreateUserRequest,
    MdlUserResponse,
    MdlUserListResponse,
    MdlDeleteUserResponse,
    MdlUserInfo
)


class ClsUserService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId

    async def fnGetAllUsers(self):
        """Get all users (Admin only)"""

        strQuery = """
            SELECT
                pk_bint_user_id,
                vchr_email,
                vchr_username,
                vchr_business_name,
                vchr_phone,
                txt_address
            FROM tbl_user
            ORDER BY pk_bint_user_id
        """

        async with self.insPool.acquire() as conn:
            rstUsers = await conn.fetch(strQuery)

        if not rstUsers:
            return MdlUserListResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No users found",
                lstUsers=[]
            )

        lstUsers = []
        for row in rstUsers:
            mdlUser = MdlUserInfo(
                intPkUserId=row['pk_bint_user_id'],
                strEmail=row['vchr_email'],
                strUsername=row['vchr_username'],
                strBusinessName=row['vchr_business_name'],
                strPhone=row['vchr_phone'],
                strAddress=row['txt_address']
            )
            lstUsers.append(mdlUser)

        return MdlUserListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstUsers)} users",
            lstUsers=lstUsers
        )

    async def fnGetSingleUser(self, intUserId: int):
        """Get single user details"""

        strQuery = """
            SELECT
                pk_bint_user_id,
                vchr_email,
                vchr_username,
                vchr_business_name,
                vchr_phone,
                txt_address
            FROM tbl_user
            WHERE pk_bint_user_id = $1
        """

        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(strQuery, intUserId)

        if not rstUser:
            return MdlUserResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="User not found",
                data=None
            )

        mdlUser = MdlUserInfo(
            intPkUserId=rstUser['pk_bint_user_id'],
            strEmail=rstUser['vchr_email'],
            strUsername=rstUser['vchr_username'],
            strBusinessName=rstUser['vchr_business_name'],
            strPhone=rstUser['vchr_phone'],
            strAddress=rstUser['txt_address']
        )

        return MdlUserResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="User found",
            data=mdlUser
        )

    async def fnAddUser(self, mdlRequest: MdlCreateUserRequest):
        """Create new user (Admin only)"""

        # Check if email already exists
        async with self.insPool.acquire() as conn:
            strCheckQuery = """
                SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1
            """
            rstExisting = await conn.fetchrow(strCheckQuery, mdlRequest.strEmail)

            if rstExisting:
                return MdlUserResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage=f"Email '{mdlRequest.strEmail}' already exists",
                    data=None
                )

            # Hash password
            strHashedPassword = fnHashPassword(mdlRequest.strPassword)

            # Insert new user
            strInsertQuery = """
                INSERT INTO tbl_user (
                    vchr_email,
                    vchr_password_hash,
                    vchr_username,
                    vchr_business_name,
                    vchr_phone,
                    txt_address
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING pk_bint_user_id
            """
            rstNew = await conn.fetchrow(
                strInsertQuery,
                mdlRequest.strEmail,
                strHashedPassword,
                mdlRequest.strUsername,
                mdlRequest.strBusinessName,
                mdlRequest.strPhone,
                mdlRequest.strAddress
            )

            intNewUserId = rstNew['pk_bint_user_id']

        # Return the created user
        return await self.fnGetSingleUser(intNewUserId)

    async def fnDeleteUser(self, intUserId: int):
        """Delete user (Admin only, cannot delete admin)"""

        # Prevent deleting admin user
        if intUserId == ADMIN_USER_ID:
            return MdlDeleteUserResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="Cannot delete admin user",
                intDeletedId=None
            )

        strQuery = """
            DELETE FROM tbl_user
            WHERE pk_bint_user_id = $1
            RETURNING pk_bint_user_id
        """

        async with self.insPool.acquire() as conn:
            rstDeleted = await conn.fetchrow(strQuery, intUserId)

        if not rstDeleted:
            return MdlDeleteUserResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="User not found",
                intDeletedId=None
            )

        return MdlDeleteUserResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="User deleted",
            intDeletedId=intUserId
        )
