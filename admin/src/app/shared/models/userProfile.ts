/**
 *
 *
 * @export
 * @class UserProfile
 */
export class UserProfile {
  private email: string;
  private name: string;
  private roles: Array<any>;
  private userId: string;
  private isAuthenticated: boolean;
  private orgModelId: string;
  private integrationType: string;
  private storeModels: Array<any>;
  private discrepancyManagerStoreModels: Array<any>;

  /**
   * Creates an instance of UserProfile.
   * @param {*} profile
   *
   * @memberof UserProfile
   */
  constructor(profile: any) {
    this.email = profile.email || null;
    this.name = profile.name || null;
    this.roles = profile.roles || [];
    this.userId = profile.userId || null;
    this.orgModelId = profile.orgModelId || null;
    this.integrationType = profile.integrationType || null;
    this.storeModels = profile.storeModels || null;
    this.discrepancyManagerStoreModels = profile.discrepancyManagerStoreModels || null;
  }

  public isUserAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  public hasRole(role: string): boolean {
    return this.roles.indexOf(role) !== -1;
  }

  public hasAnyRole(roles: Array<string>): boolean {
    return roles.some((role) => {
      return this.roles.indexOf(role) !== -1;
    });
  }

  public isAnonymous(): boolean {
    return !this.isAuthenticated;
  }
}
