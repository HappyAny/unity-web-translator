# Privacy

Translation sends selected Japanese text to the provider you configure. Model requests may include the profile's additional prompt and, when enabled, the configured number of displayed speaker/dialogue entries. MyMemory has its own usage and availability limits. Review your provider's policy before submitting text.

Supported script adapters can send future dialogue and names ahead of display. The shared prefetch count defaults to two lines; set it to zero to disable this background work. Prefetch consumes the provider's normal quota. Unseen lines never become dialogue history; a prepared translation is recorded only when displayed.

API keys remain in trusted extension storage. They can be session-only or retained locally across restarts. The page receives neither the key nor full provider settings. Key inputs remain blank when settings are loaded; a blank input keeps the saved key, while changing the API base URL clears it.

Profiles, cache and personal translations are local to this extension. JSON exports contain original/translated text and language metadata, never credentials. Dialogue history is in page memory only. Diagnostic reports retain only counters and resource paths without query strings, with bounded storage and a 2-minute expiration.

No screenshot collection, OCR, analytics, account integration or bundled application assets are included. Host permissions are requested for pages you enable and the API origin you configure. Browser extension updates and repository downloads contact GitHub.
