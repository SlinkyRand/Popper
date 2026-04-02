/* Renders a single preference row (label, description, control) based on the registry. */

/* IMPLEMENTATION NOTES */
/* Treat text fields in About as read-only display unless you explicitly mark them editable later. */
/* For action controls, do not bind them like normal values. Render them as buttons and dispatch by setting.id. */