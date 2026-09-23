#!/usr/bin/env bash
# The last question of the Windows scan investigation, and the only one that is about THIS PACKAGE rather than
# about the renderer: is the device self-check proven on the machine that actually fails?
#
#     scripts/warp-guard-verdict.sh <label-before> <label-after>
#
# It reads the two guard logs scripts/warp-question.sh already wrote -- tmp/narrow/<label>-guard.log -- and puts
# them together. The proof needs both halves and neither can be had anywhere else:
#
#   * before the copy, on the renderer built into Windows, the guard must FIRE: the scan of known numbers comes
#     back wrong and a public algorithm refuses with E_DEVICE_INCORRECT instead of returning a wrong number;
#   * after the copy, on Microsoft's redistributable renderer, the guard must STAY SILENT: the same code on a
#     working driver must not refuse it.
#
# A guard that fires on both is useless (it denies every Windows machine); one that fires on neither is asleep.
# The adapter description decides whether the second half was even asked: the copied library is only loaded by a
# process that opts into the D3D12 Agility SDK, and when it is not loaded the description does not change and
# the "after" run is a second measurement of the SAME renderer, which proves nothing about a fixed one.
#
# Prints under [warp-q], like every other question, so one grep over the job log tells the whole story. Always
# exits 0: this reports, the questions above it measure.

set -u

before=$1
after=$2
marker="[warp-q] g"

# The first line of a guard log matching a fixed string, with everything up to and including it removed.
field() {
    local file=$1 needle=$2 hit
    hit=$(grep -m1 -F -- "$needle" "$file" 2>/dev/null | sed "s/.*${needle}//")
    echo "$hit"
}

before_log="tmp/narrow/$before-guard.log"
after_log="tmp/narrow/$after-guard.log"
before_verdict=$(field "$before_log" "VERDICT: ")
after_verdict=$(field "$after_log" "VERDICT: ")
before_desc=$(field "$before_log" "adapter description=")
after_desc=$(field "$after_log" "adapter description=")

echo "$marker the guard is the device self-check of src/primitives/verify.ts, asked on this machine twice"
echo "$marker renderer before the copy: ${before_desc:-(no adapter line in $before_log)}"
echo "$marker renderer after the copy:  ${after_desc:-(no adapter line in $after_log)}"
echo "$marker guard before the copy: ${before_verdict:-(no verdict line in $before_log)}"
echo "$marker guard after the copy:  ${after_verdict:-(no verdict line in $after_log)}"

fired=no
silent=no
case "$before_verdict" in
    "THE GUARD FIRED"*) fired=yes ;;
    *) ;;
esac
case "$after_verdict" in
    "THE GUARD IS SILENT"*) silent=yes ;;
    *) ;;
esac

if [ -z "$before_verdict" ] || [ -z "$after_verdict" ]; then
    echo "$marker VERDICT: NOTHING TO COMBINE -- one of the two runs printed no verdict at all, so neither half"
    echo "$marker VERDICT: was measured. The uploaded tmp/narrow/*-guard.log files say why it could not run."
elif [ "$fired" = no ] && [ "$silent" = yes ]; then
    echo "$marker VERDICT: NOT PROVEN -- the guard stayed silent BEFORE the copy too, so this run never met a"
    echo "$marker VERDICT: wrong answer and there was nothing for the guard to catch. Read the [warp-q] b-baseline"
    echo "$marker VERDICT: scan lines above: if they passed as well, this renderer computed correctly today and"
    echo "$marker VERDICT: the defect did not reproduce; if they failed, the guard MISSED a failure the tests saw,"
    echo "$marker VERDICT: which is a defect in the check."
elif [ "$fired" = yes ] && [ "$before_desc" = "$after_desc" ]; then
    echo "$marker VERDICT: HALF PROVEN -- the guard FIRED on the renderer in the box, which is the half that"
    echo "$marker VERDICT: matters most and cannot be measured anywhere else. The adapter description did not"
    echo "$marker VERDICT: change, so the same renderer answered both times and the working-renderer half was"
    echo "$marker VERDICT: never asked. Question (f) above says whether the copied library was loaded at all."
elif [ "$fired" = yes ] && [ "$silent" = yes ]; then
    echo "$marker VERDICT: PROVEN -- the guard FIRED on the renderer in the box and STAYED SILENT on the"
    echo "$marker VERDICT: redistributable one, on the same machine in the same job. A consumer on the broken"
    echo "$marker VERDICT: renderer gets E_DEVICE_INCORRECT instead of a wrong number, and a consumer on a"
    echo "$marker VERDICT: working one is not denied."
elif [ "$fired" = yes ]; then
    echo "$marker VERDICT: HALF PROVEN, AND THE SECOND HALF IS RED -- the guard FIRED on the renderer in the box"
    echo "$marker VERDICT: and did NOT go silent on the one that replaced it. Either the newer renderer is also"
    echo "$marker VERDICT: wrong, or the check refuses a device that computes correctly, which would deny working"
    echo "$marker VERDICT: machines. The two [device-check] blocks above carry the wrong word and what it should"
    echo "$marker VERDICT: have been."
else
    echo "$marker VERDICT: NOT PROVEN -- neither run reached a settled verdict the two halves can be read from."
    echo "$marker VERDICT: The [device-check] lines above say what each run did instead."
fi
