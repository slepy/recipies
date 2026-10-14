from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PROVIDER_MODELS_URLS = {
    "openai": "https://api.openai.com/v1/models",
    "openrouter": "https://openrouter.ai/api/v1/models",
}


class ProviderConnectionError(Exception):
    pass


class InvalidProviderApiKey(ProviderConnectionError):
    pass


class ProviderRateLimitExceeded(ProviderConnectionError):
    pass


def test_provider_connection(provider: str, api_key: str) -> None:
    url = PROVIDER_MODELS_URLS.get(provider)
    if url is None:
        raise ProviderConnectionError

    request = Request(url, headers={"Authorization": f"Bearer {api_key}"})
    try:
        with urlopen(request, timeout=10) as response:
            if response.status != 200:
                raise ProviderConnectionError
    except HTTPError as error:
        if error.code in (401, 403):
            raise InvalidProviderApiKey from None
        if error.code == 429:
            raise ProviderRateLimitExceeded from None
        raise ProviderConnectionError from None
    except (TimeoutError, URLError, OSError):
        raise ProviderConnectionError from None
