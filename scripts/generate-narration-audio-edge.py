"""
Genera los MP3 de narración demo usando Microsoft Edge TTS (edge-tts).
Completamente GRATUITO, sin API key, voces neurales nativas por idioma.

Uso:
    python scripts/generate-narration-audio-edge.py
    python scripts/generate-narration-audio-edge.py --only=es
    python scripts/generate-narration-audio-edge.py --only=es --force
"""

import asyncio
import os
import sys
import argparse
import edge_tts

# ── Directorio destino ─────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'src', 'assets', 'audio')

# ── Voces masculinas nativas por idioma (edge-tts / Microsoft Edge Neural) ────
VOICES = {
    'es': 'es-ES-AlvaroNeural',   # Álvaro — castellano España, masculino, natural
    'en': 'en-GB-RyanNeural',      # Ryan — British English, masculino, claro
    'fr': 'fr-FR-HenriNeural',     # Henri — francés Francia, masculino
    'de': 'de-DE-KillianNeural',   # Killian — alemán, masculino, profesional
    'pt': 'pt-PT-DuarteNeural',    # Duarte — portugués europeo, masculino
    'it': 'it-IT-DiegoNeural',     # Diego — italiano, masculino, natural
}

# Ajuste de velocidad y tono por idioma (edge-tts SSML rate/pitch)
RATE = {
    'es': '+5%',   # Ligeramente más rápido para Álvaro
    'en': '+3%',
    'fr': '+3%',
    'de': '+2%',
    'pt': '+3%',
    'it': '+3%',
}

# ── Textos de narración ────────────────────────────────────────────────────────
TEXTS = {
    'es': """Si gestionas un club de fútbol, seguramente conoces esto de sobra.
Las cuotas que no llegan. El Excel que se complica cada temporada.
Los grupos de WhatsApp a las once de la noche.
Los papeles, los recibos, los padres a los que tienes que perseguir.
No es que lo estés haciendo mal.
Es que nadie te ha dado las herramientas correctas.
Lo que estás a punto de ver es Sphaira, la app que ya usan más de doscientos clubes para gestionar todo eso de forma automática.
En esta demo vas a ver exactamente cómo funciona: los cobros automáticos, la gestión de jugadores, las convocatorias, la comunicación con las familias, todo en un solo sitio.
Deja tu email para acceder. Es gratis, no hace falta tarjeta, y en cinco minutos vas a ver si esto es lo que tu club necesita.""",

    'en': """If you manage a football club, you probably know this all too well.
Fees that never arrive. A spreadsheet that gets more complicated every season.
WhatsApp groups at eleven at night.
The paperwork, the receipts, the parents you have to chase.
It's not that you're doing it wrong.
It's that nobody has given you the right tools.
What you're about to see is Sphaira, the app already used by more than two hundred clubs to manage all of that automatically.
In this demo you'll see exactly how it works: automatic payments, player management, squad calls, family communication, all in one place.
Leave your email to get access. It's free, no card needed, and in five minutes you'll know if this is what your club needs.""",

    'fr': """Si vous gérez un club de football, vous connaissez sûrement cela par coeur.
Les cotisations qui n'arrivent jamais. Le tableau Excel qui se complique chaque saison.
Les groupes WhatsApp à onze heures du soir.
Les papiers, les reçus, les parents que vous devez relancer.
Ce n'est pas que vous faites mal les choses.
C'est que personne ne vous a donné les bons outils.
Ce que vous allez découvrir, c'est Sphaira, l'appli déjà utilisée par plus de deux cents clubs pour tout gérer automatiquement.
Dans cette démo, vous verrez exactement comment ça fonctionne: paiements automatiques, gestion des joueurs, convocations, communication avec les familles, tout en un seul endroit.
Laissez votre email pour accéder. C'est gratuit, pas besoin de carte, et en cinq minutes vous saurez si c'est ce dont votre club a besoin.""",

    'de': """Wenn Sie einen Fußballverein leiten, kennen Sie das sicher nur zu gut.
Beiträge, die nie ankommen. Eine Tabelle, die jede Saison komplizierter wird.
WhatsApp-Gruppen um elf Uhr nachts.
Die Papiere, die Quittungen, die Eltern, hinter denen Sie herlaufen müssen.
Es liegt nicht daran, dass Sie es falsch machen.
Es liegt daran, dass niemand Ihnen die richtigen Werkzeuge gegeben hat.
Was Sie gleich sehen werden, ist Sphaira, die App, die bereits von mehr als zweihundert Vereinen genutzt wird, um alles automatisch zu verwalten.
In dieser Demo sehen Sie genau, wie es funktioniert: automatische Zahlungen, Spielerverwaltung, Kaderaufrufe, Kommunikation mit den Familien, alles an einem Ort.
Geben Sie Ihre E-Mail-Adresse ein. Es ist kostenlos, keine Karte erforderlich, und in fünf Minuten wissen Sie, ob das das ist, was Ihr Verein braucht.""",

    'pt': """Se administra um clube de futebol, provavelmente conhece bem esta situação.
As mensalidades que nunca chegam. A folha de cálculo que se complica a cada temporada.
Os grupos de WhatsApp às onze da noite.
Os papéis, os recibos, os pais que tem de contactar repetidamente.
Não é que esteja a fazer as coisas mal.
É que ninguém lhe deu as ferramentas certas.
O que está prestes a ver é o Sphaira, a app já utilizada por mais de duzentos clubes para gerir tudo automaticamente.
Nesta demo vai ver exatamente como funciona: cobranças automáticas, gestão de jogadores, convocatórias, comunicação com as famílias, tudo num só lugar.
Deixe o seu email para ter acesso. É gratuito, não precisa de cartão, e em cinco minutos saberá se é isto que o seu clube precisa.""",

    'it': """Se gestisci una squadra di calcio, probabilmente conosci bene questa situazione.
Le quote che non arrivano mai. Il foglio Excel che diventa sempre più complicato ogni stagione.
I gruppi WhatsApp alle undici di sera.
I documenti, le ricevute, i genitori che devi inseguire.
Non è che tu stia facendo le cose male.
È che nessuno ti ha dato gli strumenti giusti.
Quello che stai per vedere è Sphaira, l'app già utilizzata da più di duecento club per gestire tutto questo automaticamente.
In questa demo vedrai esattamente come funziona: pagamenti automatici, gestione dei giocatori, convocazioni, comunicazione con le famiglie, tutto in un unico posto.
Lascia la tua email per accedere. È gratuito, non serve la carta, e in cinque minuti saprai se questo è quello di cui il tuo club ha bisogno.""",
}


async def generate(lang: str, force: bool) -> bool:
    out_path = os.path.join(OUTPUT_DIR, f'narration-{lang}.mp3')
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not force and os.path.exists(out_path):
        size = os.path.getsize(out_path)
        if size > 10_000:
            print(f'  ⏩ {lang}: ya existe ({size // 1024} KB) — usa --force para regenerar')
            return True

    voice = VOICES[lang]
    rate  = RATE.get(lang, '+0%')
    text  = TEXTS[lang]

    print(f'  🎙  {lang}: generando con {voice} (rate={rate})...')
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(out_path)
        size = os.path.getsize(out_path)
        rel  = os.path.relpath(out_path, os.path.join(SCRIPT_DIR, '..'))
        print(f'  ✅ {lang}: guardado → {rel} ({size // 1024} KB)')
        return True
    except Exception as e:
        print(f'  ❌ {lang}: {e}')
        return False


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only',  help='Generar solo este idioma (es/en/fr/de/pt/it)')
    parser.add_argument('--force', action='store_true', help='Regenerar aunque ya exista')
    args = parser.parse_args()

    langs = [args.only] if args.only else list(TEXTS.keys())
    if args.only and args.only not in TEXTS:
        print(f'❌ Idioma desconocido: {args.only}. Opciones: {", ".join(TEXTS.keys())}')
        sys.exit(1)

    print('\n🎧  Sphaira — Generador de audio (Microsoft Edge TTS, gratuito)')
    print(f'    Destino : {os.path.relpath(OUTPUT_DIR)}')
    print(f'    Idiomas : {", ".join(langs)}\n')

    ok = fail = 0
    for lang in langs:
        result = await generate(lang, args.force)
        if result:
            ok += 1
        else:
            fail += 1

    print(f'\n{"─"*40}')
    print(f'  ✅ OK: {ok} | ❌ Error: {fail}')
    if fail == 0:
        print('  🎉 Todos los audios generados correctamente.\n')
    else:
        print('  ⚠️  Revisa los errores anteriores.\n')


asyncio.run(main())
