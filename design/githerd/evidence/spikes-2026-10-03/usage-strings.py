# List user-facing usage-limit strings in the Claude Code binary (read only; nothing is spent).
import re
b=open('/home/apowers/.local/share/claude/versions/2.1.288','rb').read()
pats=[rb"You've hit your[^\x00\"`]{0,160}", rb"[^\x00\"`]{0,60}limit resets[^\x00\"`]{0,80}", rb"[^\x00\"`]{0,80}extra usage[^\x00\"`]{0,80}",
      rb"Stop and wait for limit to reset[^\x00\"`]{0,60}", rb"[^\x00\"`]{0,40}of your weekly limit[^\x00\"`]{0,40}", rb"rate_limit_options[^\x00]{0,40}"]
for p in pats:
    s=sorted(set(m.group(0).decode('latin1') for m in re.finditer(p,b)))
    print('==',p[:40]); [print('  ',x[:200]) for x in s[:14]]
