print("CSRFExemptMiddleware loaded")
import re
from django.middleware.csrf import CsrfViewMiddleware

EXEMPT_URLS = [re.compile(r'^api/')]

class CSRFExemptMiddleware(CsrfViewMiddleware):
    def process_view(self, request, callback, callback_args, callback_kwargs):
        print(f"process_view called for: {request.path_info}")
        for url in EXEMPT_URLS:
            if url.match(request.path_info.lstrip('/')):
                return None
        return super().process_view(request, callback, callback_args, callback_kwargs)