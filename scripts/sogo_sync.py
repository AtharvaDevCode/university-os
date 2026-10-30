import json
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = "https://sogo.uni-koblenz.de"
PROFILE = Path(".sogo-profile")
EXPORT = Path("sogo_export")

INBOX_PATTERN = re.compile(
    r"/SOGo/so/atharva/Mail/0/folderINBOX/view$"
)

MESSAGE_PATTERN = re.compile(
    r"/SOGo/so/atharva/Mail/0/folderINBOX/(\d+)/view$"
)


def save_json(path, data):
    temp = path.with_suffix(".tmp")
    temp.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temp.replace(path)


def main():
    EXPORT.mkdir(exist_ok=True)
    responses = {}

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            str(PROFILE.resolve()),
            headless=False,
            viewport={"width": 1440, "height": 900},
        )

        page = context.pages[0] if context.pages else context.new_page()

        def on_response(response):
            if response.status != 200:
                return

            url = response.url

            try:
                if INBOX_PATTERN.search(url):
                    responses["inbox"] = response.json()
                    print("[INBOX] Captured")

                else:
                    match = MESSAGE_PATTERN.search(url)

                    if match:
                        uid = match.group(1)
                        responses[f"message_{uid}"] = response.json()
                        print(f"[MESSAGE] {uid}")

            except Exception as error:
                print("[RESPONSE ERROR]", error)

        page.on("response", on_response)

        print("Opening SOGo...")
        page.goto(
            f"{BASE_URL}/SOGo/so/atharva/Mail/view",
            wait_until="domcontentloaded",
        )

        input(
            "\nLog in if needed. Click Inbox manually. "
            "Wait until it loads, then press ENTER here..."
        )

        # The inbox response may have arrived before ENTER.
        # If not, ask the user to click Inbox again.
        if "inbox" not in responses:
            input("Click Inbox once more, then press ENTER...")
            deadline = time.time() + 30

            while "inbox" not in responses and time.time() < deadline:
                page.wait_for_timeout(250)

        if "inbox" not in responses:
            print("ERROR: Inbox response not captured.")
            context.close()
            sys.exit(1)

        inbox = responses.pop("inbox")
        save_json(EXPORT / "inbox.json", inbox)

        uids = [int(uid) for uid in inbox.get("uids", [])]

        print(f"\nFound {len(uids)} messages.")

        failed = []

        for uid in uids:
            key = f"message_{uid}"
            responses.pop(key, None)

            try:
                # Trigger the request through SOGo's authenticated UI.
                page.goto(
                    f"{BASE_URL}/SOGo/so/atharva/Mail/view"
                    f"#!/Mail/0/INBOX/{uid}",
                    wait_until="domcontentloaded",
                )

                deadline = time.time() + 25

                while key not in responses and time.time() < deadline:
                    page.wait_for_timeout(200)

                if key not in responses:
                    raise TimeoutError("Message response not captured")

                message = responses.pop(key)

                save_json(
                    EXPORT / f"message_{uid}.json",
                    message,
                )

            except Exception as error:
                print(f"[FAILED] {uid}: {error}")
                failed.append(uid)

        context.close()

    print("\nExport finished.")
    print("Successful:", len(uids) - len(failed))
    print("Failed:", len(failed))

    if failed:
        print("Import skipped.")
        sys.exit(1)

    print("\nImporting into Neon...")

    result = subprocess.run(
        ["node", "scripts/import-sogo-export.js"],
        check=False,
    )

    sys.exit(result.returncode)


if __name__ == "__main__":
    main()