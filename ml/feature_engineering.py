def compute_derived_features(data):
    duration = float(data.get("duration", 0.0))
    if duration <= 0:
        duration = 1.0

    active_time = float(data.get("active_time", 0.0))
    if active_time > duration:
        active_time = duration

    idle_time = float(data.get("idle_time", 0.0))
    if active_time + idle_time > duration:
        idle_time = max(0.0, duration - active_time)

    mouse_clicks = int(data.get("mouse_clicks", 0))
    keyboard_events = int(data.get("keyboard_events", 0))
    scroll_events = int(data.get("scroll_events", 0))
    mouse_distance = float(data.get("mouse_distance", 0.0))
    app_switches = int(data.get("app_switches", 0))
    application_count = int(data.get("application_count", 1))
    if application_count <= 0:
        application_count = 1

    duration_minutes = duration / 60.0
    active_minutes = active_time / 60.0
    if active_minutes <= 0.01:
        active_minutes = 0.01

    focus_index = round(min(100.0, max(0.0, (active_time / duration) * 100.0)), 2)
    idle_ratio = round(min(100.0, max(0.0, (idle_time / duration) * 100.0)), 2)

    total_events = mouse_clicks + keyboard_events + scroll_events
    activity_density = round(total_events / active_minutes, 2)
    switch_frequency = round(app_switches / duration_minutes, 2)

    switch_penalty = min(50.0, switch_frequency * 4.0)
    idle_penalty = idle_ratio * 0.5
    continuity_index = round(max(0.0, min(100.0, 100.0 - (switch_penalty + idle_penalty))), 2)

    ratio_factor = (idle_time / (active_time + 1.0)) * 25.0
    fragmentation_raw = (switch_frequency * 6.5) + ratio_factor
    fragmentation_index = round(max(0.0, min(100.0, fragmentation_raw)), 2)

    event_imbalance = abs(mouse_clicks - keyboard_events) / (total_events + 1.0)
    stability_penalty = (event_imbalance * 30.0) + (fragmentation_index * 0.4)
    interaction_stability = round(max(0.0, min(100.0, 100.0 - stability_penalty)), 2)

    return {
        "focus_index": focus_index,
        "continuity_index": continuity_index,
        "interaction_stability": interaction_stability,
        "fragmentation_index": fragmentation_index,
        "activity_density": activity_density,
        "idle_ratio": idle_ratio,
        "switch_frequency": switch_frequency
    }
