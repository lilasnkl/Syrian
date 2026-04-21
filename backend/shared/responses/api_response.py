from rest_framework.response import Response


def success_response(data=None, message="OK", status_code=200, meta=None):
    payload = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        payload["meta"] = meta
    return Response(payload, status=status_code)


def error_payload(error_type, code, details=None):
    return {
        "success": False,
        "error": {
            "type": error_type,
            "code": code,
            "details": details or {},
        },
    }
