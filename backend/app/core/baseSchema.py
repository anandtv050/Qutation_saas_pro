from pydantic import BaseModel
from typing import Optional
from fastapi import status as HttpStatus


# Status Constants
class ResponseStatus:
    # Response status codes
    SUCCESS = 1
    ERROR = 0
    NO_DATA = -1

    # Response status strings
    SUCCESS_STR = "SUCCESS"
    NO_DATA_STR = "NO_DATA"
    ERROR_STR = "ERROR"

    # HTTP status codes
    HTTP_OK = HttpStatus.HTTP_200_OK
    HTTP_CREATED = HttpStatus.HTTP_201_CREATED
    HTTP_BAD_REQUEST = HttpStatus.HTTP_400_BAD_REQUEST
    HTTP_NOT_FOUND = HttpStatus.HTTP_404_NOT_FOUND
    HTTP_CONFLICT = HttpStatus.HTTP_409_CONFLICT
    HTTP_INTERNAL_ERROR = HttpStatus.HTTP_500_INTERNAL_SERVER_ERROR


# Base Request - All requests should inherit this
class MdlBaseRequest(BaseModel):
    intUserId: int


# Base Response - All responses should inherit this
class MdlBaseResponse(BaseModel):
    intStatus: int = ResponseStatus.SUCCESS
    strStatus: str = ResponseStatus.SUCCESS_STR
    intStatusCode: int = ResponseStatus.HTTP_OK
    strMessage: str
