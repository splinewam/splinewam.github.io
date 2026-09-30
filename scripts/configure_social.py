"""Write crawler-visible absolute metadata once the public site URL is known."""

import argparse
import ipaddress
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit


class SocialTags(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and (
            attrs.get("property") in {"og:url", "og:image", "og:image:width", "og:image:height"}
            or attrs.get("name") == "twitter:image"
        ):
            self.tags.append(self.get_starttag_text())


def configure(html, site_url):
    url = urlsplit(site_url)
    if url.scheme != "https" or not url.hostname or url.query or url.fragment or url.username or url.password:
        raise ValueError("Use the full public HTTPS site URL, without credentials, query, or fragment.")
    if url.hostname == "localhost" or url.hostname.endswith((".localhost", ".local")):
        raise ValueError("A local address cannot be used for social previews.")
    try:
        address = ipaddress.ip_address(url.hostname)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise ValueError("A private IP cannot be used for social previews.")
    site_url = site_url.rstrip("/") + "/"
    image_url = urljoin(site_url, "static/images/social-preview.jpg")
    parser = SocialTags()
    parser.feed(html)
    for tag in parser.tags:
        html = html.replace("  " + tag + "\n", "")
    tags = "\n".join([
        f'  <meta property="og:url" content="{escape(site_url, quote=True)}">',
        f'  <meta property="og:image" content="{escape(image_url, quote=True)}">',
        '  <meta property="og:image:width" content="1200">',
        '  <meta property="og:image:height" content="630">',
        f'  <meta name="twitter:image" content="{escape(image_url, quote=True)}">',
    ])
    return html.replace("</head>", tags + "\n</head>")


if __name__ == "__main__":
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument("site_url", help="Full public HTTPS URL, including the repository path")
    args = arguments.parse_args()
    index = Path(__file__).resolve().parent.parent / "index.html"
    try:
        updated = configure(index.read_text(), args.site_url)
    except ValueError as error:
        arguments.error(str(error))
    index.write_text(updated)
    print("Updated Open Graph and Twitter image URLs in", index)
