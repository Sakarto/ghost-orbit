<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Orbit data is fetched server-side (src/lib/orbit.functions.ts) with a bundled fallback in src/data; why: avoids browser CORS blocks from CelesTrak.
- ElevenLabs playback uses a disposable Web Audio transmission graph in spooky-audio; why: centralizes radio effects and disconnects feedback/modulation on replay, end, or panel dismissal. Browser speech synthesis remains an unprocessed fallback because its output cannot be routed through Web Audio.
- Shared ghost voice configuration supplies UI choices, server validation, synthesis settings, and playback tuning; why: keeps voice defaults consistent and numerical tuning testable without provider requests.
- Provider audio response decoding is centralized in ghost-response; why: failed HTTP payloads retain their error body and can never become playable audio.
- ESA macro statistics live in a dated source dataset separate from radar telemetry; why: historical population estimates must not be mistaken for current tracked targets.
