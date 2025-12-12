from fastapi  import HTTPException,status

from app.api.login.schema import MdlLoginResponse
from app.core.security import fnCreateAccesToken


class ClsLoginService:
    def __init__(self,insPool) -> None:
        self.insPool = insPool
    
    async def fnLoginService(self,mdlLoginRequest) :
        
            # get user details using email 
            strQuery = """ SELECT 
                                pk_bint_user_id,
                                vchr_email,
                                vchr_password_hash,
                                vchr_username,
                                vchr_business_name
                            FROM tbl_user
                            WHERE vchr_email = $1
                            """
            async with self.insPool.acquire() as conn:
                rstUser = await conn.fetchrow(strQuery,mdlLoginRequest.email)
            
            if not rstUser:
                raise HTTPException(
                    status_code  =status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Email or password"
                )
            # verify the password currently no need bcz  no registration
            ## TODO ::  passwrd verification
            
            # if not verify_password(request.password, user['vchr_password_hash']):
            #     raise HTTPException(
            #         status_code=status.HTTP_401_UNAUTHORIZED,
            #         detail="Invalid email or password"
            #     )

            ## Create JWT token
            strAccessToken = fnCreateAccesToken(
                data={
                    "user_id": rstUser['pk_bint_user_id'],
                    "email": rstUser['vchr_email']
                }
            )

            dctUserInfo = {
                "intUserId": rstUser['pk_bint_user_id'],
                "strEmail": rstUser['vchr_email'],
                "strUserName": rstUser['vchr_username'],
                "strBusinessName": rstUser['vchr_business_name']
            }

            # Return instance, not class!
            return MdlLoginResponse(
                strAccessToken=strAccessToken,
                strTokentype="bearer",
                dctUserInfo=dctUserInfo
            )
            
            
            