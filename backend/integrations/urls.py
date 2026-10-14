from django.urls import path

from integrations.views import ActivateProviderView, ProviderConfigurationView


urlpatterns = [
    path("ai/", ProviderConfigurationView.as_view(), name="ai-provider-configuration"),
    path("ai/activate/", ActivateProviderView.as_view(), name="ai-provider-activate"),
]
