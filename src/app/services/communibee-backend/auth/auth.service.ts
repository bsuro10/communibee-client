import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import * as auth0 from 'auth0-js';
import { environment } from '../../../../environments/environment';
import {TokenPayload} from './token-payload';
import { timer, of } from 'rxjs';
import {mergeMap} from 'rxjs/operators';

@Injectable()
export class AuthService {

  private idToken: string;
  private idTokenPayload: TokenPayload;
  private accessToken: string;
  private expiresAt: number;
  private refreshSubscription: any;

  auth0 = new auth0.WebAuth({
    clientID: environment.auth0.clientId,
    domain: environment.auth0.domain,
    responseType: 'token id_token',
    redirectUri: environment.auth0.redirectUri,
    scope: 'openid email profile',
  });

  constructor(private router: Router) {
    this.idToken = '';
    this.accessToken = '';
    this.expiresAt = 0;
  }

  public getAccessToken(): string {
    return this.accessToken;
  }

  public getIdTokenPayload(): TokenPayload {
    return this.idTokenPayload;
  }

  public getLocalUserId(): string {
    return this.idTokenPayload.sub;
  }

  public getIdToken(): string {
    return this.idToken;
  }

  public login(): void {
    this.auth0.authorize();
  }

  public register(): void {
    this.auth0.authorize({
      redirectUri: environment.auth0.registerRedirectUri
    });
  }

  public handleAuthentication(): void {
    this.auth0.parseHash((err, authResult) => {
      console.log(authResult);
      if (authResult && authResult.accessToken && authResult.idToken) {
        window.location.hash = '';
        this.localLogin(authResult);
        console.log('Login succeeded');
      } else if (err) {
        this.router.navigate(['/']);
        console.log('Login Failed');
      }
    });
  }

  private localLogin(authResult): void {
    // Set isLoggedIn flag in localStorage
    localStorage.setItem('isLoggedIn', 'true');
    // Set the time that the access token will expire at
    this.expiresAt = (authResult.expiresIn * 1000) + new Date().getTime();
    this.accessToken = authResult.accessToken;
    this.idToken = authResult.idToken;
    this.idTokenPayload = authResult.idTokenPayload;

    this.scheduleRenewal();
  }

  public renewTokens(): void {
    this.auth0.checkSession({
      responseType: 'token id_token'
    }, (err, authResult) => {
      console.log(authResult);
      if (authResult && authResult.accessToken && authResult.idToken) {
        this.localLogin(authResult);
      } else if (err) {
        console.error('Could not renew token, logging out');
        console.error(err);
        this.logout();
      }
    });
  }

  public logout(): void {
    // Remove tokens and expiry time
    this.accessToken = '';
    this.idToken = '';
    this.idTokenPayload = {};
    this.expiresAt = 0;
    // Remove isLoggedIn flag from localStorage
    localStorage.removeItem('isLoggedIn');
    this.unscheduleRenewal();

    // Go back to the home route
    this.router.navigate(['/']);
  }

  public isAuthenticated(): boolean {
    // Check whether the current time is past the
    // access token's expiry time
    return new Date().getTime() < this.expiresAt;
  }

  public scheduleRenewal() {
    if (!this.isAuthenticated()) { return; }
    this.unscheduleRenewal();

    const expiresIn$ = of(this.expiresAt).pipe(
      mergeMap(
        expiresAt => {
          const now = Date.now();
          // Use timer to track delay until expiration
          // to run the refresh at the proper time
          return timer(Math.max(1, this.expiresAt - now));
        }
      )
    );

    // Once the delay time from above is
    // reached, get a new JWT and schedule
    // additional refreshes
    this.refreshSubscription = expiresIn$.subscribe(
      () => {
        this.renewTokens();
        this.scheduleRenewal();
      }
    );
  }

  public unscheduleRenewal() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

}
