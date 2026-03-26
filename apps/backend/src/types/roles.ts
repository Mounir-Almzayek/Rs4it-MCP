/**
 * Role model and visibility (Phase 09).
 * Roles support inheritance: e.g. full_stack inherits web_engineer + backend_engineer.
 */

/** Single role definition; inherits from other roles (transitive). */
export interface RoleDefinition {
  /** Unique id (e.g. developer, web_engineer, full_stack). */
  id: string;
  /** Human-readable name. */
  name?: string;
  /** Role ids this role inherits from (visibility union). */
  inherits?: string[];
}

/** Role config file: list of roles and default. */
export interface RoleConfig {
  /** Default role when client does not send one (e.g. developer = see all). */
  defaultRole?: string;
  roles: RoleDefinition[];
}

/**
 * Entity (tool, skill, plugin) can optionally restrict visibility to certain roles.
 * If allowedRoles is missing or empty, all roles can see it.
 */
export interface AllowedRoles {
  /** Role ids allowed to see/use this entity. Empty or undefined = all roles. */
  allowedRoles?: string[];
}
