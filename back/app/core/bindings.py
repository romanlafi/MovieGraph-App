"""Read Worker bindings from native objects or local test dictionaries."""


def binding_value(env, name: str, default=None):
    return env.get(name, default) if isinstance(env, dict) else getattr(env, name, default)
