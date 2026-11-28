# Directed side step
In the stage setup of the animation Studio, write “خطوة واحدة ناحية الشمال”
or “خطوة جانبية لليمين” in the visual scene description. The layered worker
automatically schedules one relative screen-space side step for a solo rigged
performer in a wide shot of at least two seconds. Static backgrounds, voice
generation and timeline mixing are unchanged. The camera stays still during
the action so the contact reads on screen.

The rig art must contain two separate legs and the torso, all registered to
the same transparent canvas and with hip pivots positioned at the legs' starts.
The compositor estimates knee/ankle from the leg silhouette, validates reach,
and keeps explicitly incompatible actions, ambiguous cues, full-image shots,
unrigged characters, medium shots and group shots on their existing renderer
path. Speech timing/visemes are not part of this change.

Run `python -m unittest discover -s source/layered-worker` from the repo root.
