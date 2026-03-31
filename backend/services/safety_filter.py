"""
Copyright Safety Filter
========================
IMPORTANT DISCLAIMER:
This filter REDUCES copyright risk but cannot GUARANTEE copyright-free output.
AI image generation can inadvertently reproduce protected visual elements even
with filtered prompts. Users must review all generated designs before commercial use
and consult legal counsel for any commercial applications.

This filter operates at TWO levels:
1. Static keyword matching against known brands, characters, and trademarks
2. Semantic analysis via Ollama to detect subtle infringement requests
"""
import json
import re
from typing import List, Tuple
import httpx

from config import settings


# ---- Blocked terms lists ----

BLOCKED_BRANDS = {
    # Sportswear
    "nike", "adidas", "puma", "reebok", "new balance", "under armour",
    "champion", "fila", "vans", "converse", "supreme", "palace",
    "off-white", "off white", "stone island",
    # Luxury fashion
    "gucci", "louis vuitton", "lv", "chanel", "prada", "versace",
    "burberry", "hermes", "dior", "ysl", "saint laurent", "balenciaga",
    "givenchy", "fendi", "valentino", "bottega veneta",
    # Streetwear
    "bape", "a bathing ape", "stussy", "carhartt", "dickies",
    "huf", "obey", "thrasher", "anti social social club",
    # Entertainment
    "disney", "marvel", "dc comics", "warner bros", "universal studios",
    "dreamworks", "pixar", "nickelodeon", "cartoon network",
    "nintendo", "sony", "playstation", "xbox", "microsoft",
    "apple", "google", "coca cola", "pepsi", "mcdonald's",
    "starbucks", "amazon", "netflix", "spotify", "youtube",
    # Music
    "rolling stones tongue", "metallica", "nirvana", "kiss band",
    "grateful dead", "acdc", "pink floyd",
    # Sports teams (generic - full teams list would be extensive)
    "yankees logo", "lakers logo", "bulls logo", "celtics logo",
    "manchester united", "real madrid", "barcelona fc",
}

BLOCKED_CHARACTERS = {
    # Disney/Pixar
    "mickey mouse", "minnie mouse", "donald duck", "goofy", "pluto disney",
    "cinderella", "snow white", "elsa frozen", "anna frozen", "simba",
    "mufasa", "nemo", "dory", "woody toy story", "buzz lightyear",
    "wall-e", "incredibles", "moana", "rapunzel tangled",
    # Marvel
    "spider-man", "spiderman", "iron man", "captain america",
    "thor marvel", "hulk marvel", "black widow marvel", "hawkeye",
    "doctor strange", "black panther", "captain marvel",
    "wolverine", "x-men", "deadpool",
    # DC
    "batman", "superman", "wonder woman", "the joker", "harley quinn",
    "aquaman", "the flash dc", "green lantern",
    # Anime/Manga (popular trademarked characters)
    "naruto uzumaki", "goku dragon ball", "pikachu", "pokemon characters",
    "sailor moon", "luffy one piece", "attack on titan characters",
    "demon slayer characters", "my hero academia characters",
    # Video games
    "mario nintendo", "luigi", "zelda character", "link zelda",
    "samus metroid", "kirby nintendo", "donkey kong",
    "master chief halo", "kratos god of war",
    # Classic cartoons
    "bugs bunny", "daffy duck", "tweety bird", "sylvester cat",
    "road runner", "wile e coyote", "tom and jerry", "scooby doo",
    "fred flintstone", "homer simpson", "bart simpson",
    "stewie griffin", "rick sanchez", "morty smith",
    # Other IP
    "hello kitty", "snoopy", "charlie brown", "garfield cat",
}

BLOCKED_LOGOS_SYMBOLS = {
    "swoosh logo", "three stripes logo", "jumpman logo",
    "supreme box logo", "lacoste crocodile", "polo ralph lauren horse",
    "playboy bunny", "rolling stones lips",
    "peace sign with specific branding",
}

# Living artists whose style copying carries risk
ARTIST_STYLE_WARNINGS = {
    "banksy", "kaws", "takashi murakami", "jeff koons", "damien hirst",
    "keith haring style", "jean-michel basquiat style",
}

RISK_TERMS_MEDIUM = {
    "inspired by", "style of", "like the brand", "similar to",
    "copy", "replica", "knockoff", "imitation",
}


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", " ", text.lower())


def find_blocked_terms(prompt: str) -> Tuple[List[str], str]:
    """Find blocked terms in the prompt. Returns (found_terms, risk_level)."""
    normalized = normalize(prompt)
    found = []

    for term in BLOCKED_BRANDS:
        if term in normalized:
            found.append(term)

    for term in BLOCKED_CHARACTERS:
        if term in normalized:
            found.append(term)

    for term in BLOCKED_LOGOS_SYMBOLS:
        if term in normalized:
            found.append(term)

    # Check artist names separately (lower risk but worth flagging)
    artist_warnings = []
    for artist in ARTIST_STYLE_WARNINGS:
        if artist in normalized:
            artist_warnings.append(artist)

    if found:
        return found + artist_warnings, "high"
    elif artist_warnings:
        return artist_warnings, "medium"

    # Check medium risk terms
    medium_found = [t for t in RISK_TERMS_MEDIUM if t in normalized]
    if medium_found:
        return medium_found, "low"

    return [], "none"


async def semantic_check_with_ollama(prompt: str) -> dict:
    """Use Ollama to semantically check for subtle copyright infringement."""
    system = """You are a copyright risk analyzer for apparel design.
Analyze the given prompt for potential copyright infringement risks.

Look for:
1. Subtle references to trademarked characters (e.g., "a famous mouse with big ears")
2. Descriptions of trademarked logos or symbols
3. Requests to copy specific existing designs
4. References to copyrighted artwork styles in a derivative way

Return JSON with:
- has_risk: boolean
- risk_level: "none", "low", "medium", "high"
- explanation: brief explanation
- risky_phrases: array of specific phrases that are risky"""

    try:
        payload = {
            "model": settings.ollama_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": f"Analyze this prompt: {prompt}"},
            ],
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.1, "num_predict": 300},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{settings.ollama_host}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            result = json.loads(data["message"]["content"])
            return result
    except Exception:
        return {"has_risk": False, "risk_level": "none", "explanation": "", "risky_phrases": []}


async def rewrite_risky_prompt(prompt: str, risks: List[str]) -> str:
    """Use Ollama to rewrite a risky prompt to remove copyright concerns."""
    system = """You are a creative director helping rewrite apparel design prompts to remove copyright risks.

Given a prompt with identified risks, create an original version that:
1. Preserves the artistic concept and style
2. Removes all specific brand/character references
3. Uses generic, descriptive language instead of trademarked names
4. Maintains the spirit of the design without copying protected IP

Return ONLY the rewritten prompt text, nothing else."""

    try:
        user_msg = f"""Original prompt: {prompt}
Identified risks: {', '.join(risks)}

Rewrite this prompt to remove copyright concerns while keeping the creative concept:"""

        payload = {
            "model": settings.ollama_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": 300},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{settings.ollama_host}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"].strip()
    except Exception:
        # Fallback: remove blocked terms manually
        rewritten = prompt
        for term in risks:
            rewritten = re.sub(re.escape(term), "[REMOVED]", rewritten, flags=re.IGNORECASE)
        return rewritten


class SafetyFilterService:
    async def check_prompt_safety(self, prompt: str) -> dict:
        """Main safety check function. Returns comprehensive safety assessment."""
        if not prompt.strip():
            return {
                "is_safe": True,
                "risk_level": "none",
                "warnings": [],
                "suggested_prompt": None,
                "blocked_terms": [],
            }

        # Static keyword check
        blocked_terms, static_risk = find_blocked_terms(prompt)

        warnings = []
        if static_risk == "high":
            warnings.append(
                "This prompt contains references to trademarked brands, characters, or logos. "
                "Generating designs with these elements may infringe on intellectual property rights."
            )
        elif static_risk == "medium":
            warnings.append(
                "This prompt references artist names. Generating designs in a specific living artist's "
                "style for commercial use may raise copyright concerns."
            )

        # Semantic check with Ollama (if static check is clean and Ollama is available)
        semantic_result = {"has_risk": False, "risk_level": "none", "risky_phrases": []}
        if static_risk == "none" and settings.safety_filter_enabled:
            try:
                semantic_result = await semantic_check_with_ollama(prompt)
                if semantic_result.get("has_risk") and semantic_result.get("explanation"):
                    warnings.append(semantic_result["explanation"])
                    blocked_terms.extend(semantic_result.get("risky_phrases", []))
            except Exception:
                pass  # Semantic check is optional

        # Determine final risk level
        risk_levels = {"none": 0, "low": 1, "medium": 2, "high": 3}
        final_risk = max(
            risk_levels.get(static_risk, 0),
            risk_levels.get(semantic_result.get("risk_level", "none"), 0),
        )
        risk_labels = {0: "none", 1: "low", 2: "medium", 3: "high"}
        final_risk_label = risk_labels[final_risk]

        # Generate suggested prompt if there are issues
        suggested_prompt = None
        if final_risk > 0 and blocked_terms:
            try:
                suggested_prompt = await rewrite_risky_prompt(prompt, blocked_terms)
            except Exception:
                pass

        is_safe = final_risk < 3  # high risk = not safe

        return {
            "is_safe": is_safe,
            "risk_level": final_risk_label,
            "warnings": warnings,
            "suggested_prompt": suggested_prompt,
            "blocked_terms": list(set(blocked_terms)),
        }

    def build_safety_negative_prompt(self) -> str:
        """Return standard negative prompts that reduce IP/copyright risks."""
        return (
            "brand logo, trademark, copyright symbol, registered trademark, "
            "brand name, company logo, recognizable mascot, famous character, "
            "watermark, signature, artist name, web address, url, text overlay, "
            "licensed character, cartoon character face, superhero costume specific details"
        )


safety_filter_service = SafetyFilterService()
