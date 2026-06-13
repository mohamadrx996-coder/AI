import httpx
import asyncio
import os

# الألوان
RED = "\033[1;31m"
GREEN = "\033[1;32m"
CYAN = "\033[1;36m"
WHITE = "\033[1;37m"
RESET = "\033[0m"

async def join_bot_to_server():
    os.system('cls' if os.name == 'nt' else 'clear')
    print(f"{RED}--- GROup #963 Bot Joiner API ---{RESET}\n")

    # 1. طلب البيانات
    user_token = input(f"{CYAN}[?]{WHITE} Enter Your Account Token (User): {RESET}").strip()
    bot_token = input(f"{CYAN}[?]{WHITE} Enter Bot Token: {RESET}").strip()
    guild_id = input(f"{CYAN}[?]{WHITE} Enter Server ID: {RESET}").strip()

    # 2. جلب معلومات البوت (Client ID)
    async with httpx.AsyncClient() as client:
        bot_headers = {"Authorization": f"Bot {bot_token}"}
        user_headers = {"Authorization": user_token} # حسابك لا يحتاج كلمة Bot

        try:
            bot_info = await client.get("https://discord.com/api/v9/users/@me", headers=bot_headers)
            if bot_info.status_code != 200:
                print(f"{RED}❌ توكن البوت غير صحيح!{RESET}")
                return
            bot_id = bot_info.json()['id']

            print(f"{GREEN}[*] Attempting to authorize bot via User API...{RESET}")

            # 3. العملية البرمجية للإضافة (OAuth2 Authorization)
            # هذه الخطوة تحاكي ضغطك على زر "Authorize" داخل السيرفر
            auth_url = f"https://discord.com/api/v9/oauth2/authorize?client_id={bot_id}&scope=bot&permissions=8"
            payload = {
                "authorize": True,
                "guild_id": guild_id,
                "permissions": "8"
            }

            # إرسال الطلب بتوكن حسابك الشخصي
            response = await client.post(auth_url, headers=user_headers, json=payload)

            if response.status_code == 200 or response.status_code == 204:
                print(f"{GREEN}✅ SUCCESS: Bot has been added to the server via API!{RESET}")
            elif response.status_code == 401:
                print(f"{RED}❌ ERROR: Your User Token is invalid!{RESET}")
            else:
                print(f"{RED}❌ FAILED: Code {response.status_code}{RESET}")
                print(f"{WHITE}Details: {response.text}{RESET}")

        except Exception as e:
            print(f"{RED}❌ Error occurred: {e}{RESET}")

if __name__ == "__main__":
    asyncio.run(join_bot_to_server())