from pydantic import BaseModel, EmailStr

class MdlLoginRequest(BaseModel):
    email: EmailStr
    password: str

class MdlLoginResponse(BaseModel):
    strAccessToken:str
    strTokentype:str ="bearer"
    dctUserInfo :dict
     