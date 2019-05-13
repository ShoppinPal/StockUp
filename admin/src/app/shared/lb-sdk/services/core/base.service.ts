/* tslint:disable */
import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpParams, HttpResponse, HttpParameterCodec } from '@angular/common/http';
import { NgModule, ModuleWithProviders } from '@angular/core';
import { ErrorHandler } from './error.service';
import { LoopBackAuth } from './auth.service';
import { LoopBackConfig } from '../../lb.config';
import { LoopBackFilter, AccessToken } from '../../models/BaseModels';
import { SDKModels } from '../custom/SDKModels';
import { Observable, Subject } from 'rxjs';
import { catchError, map, filter } from 'rxjs/operators';
import { SocketConnection } from '../../sockets/socket.connections';
// Making Sure EventSource Type is available to avoid compilation issues.
declare var EventSource: any;
class CustomQueryEncoderHelper implements HttpParameterCodec {
  encodeKey(k: string): string {
      return encodeURIComponent(k);
  }

  encodeValue(v: string): string {
      return encodeURIComponent(v);
  }

  decodeKey(k: string): string {
      return decodeURIComponent(k);
  }

  decodeValue(v: string): string {
      return decodeURIComponent(v);
  }
}
/**
* @module BaseLoopBackApi
* @author Jonathan Casarrubias <@johncasarrubias> <github:jonathan-casarrubias>
* @author Nikolay Matiushenkov <https://github.com/mnvx>
* @license MIT
* @description
* Abstract class that will be implemented in every custom service automatically built
* by the sdk builder.
* It provides the core functionallity for every API call, either by HTTP Calls or by
* WebSockets.
**/
@Injectable()
export abstract class BaseLoopBackApi {

  protected path: string;
  protected model: any;

  constructor(
    @Inject(HttpClient) protected http: HttpClient,
    @Inject(SocketConnection) protected connection: SocketConnection,
    @Inject(SDKModels) protected models: SDKModels,
    @Inject(LoopBackAuth) protected auth: LoopBackAuth,
    @Optional() @Inject(ErrorHandler) protected errorHandler: ErrorHandler
  ) {
    this.model = this.models.get(this.getModelName());
  }
  /**
   * @method request
   * @param {string}  method      Request method (GET, POST, PUT)
   * @param {string}  url         Request url (my-host/my-url/:id)
   * @param {any}     routeParams Values of url parameters
   * @param {any}     urlParams   Parameters for building url (filter and other)
   * @param {any}     postBody    Request postBody
   * @return {Observable<any>}
   * @description
   * This is a core method, every HTTP Call will be done from here, every API Service will
   * extend this class and use this method to get RESTful communication.
   **/
  public request(
    method         : string,
    url            : string,
    routeParams    : any = {},
    urlParams      : any = {},
    postBody       : any = {},
    pubsub         : boolean = false,
    customHeaders? : Function
  ): Observable<any> {
    // Transpile route variables to the actual request Values
    Object.keys(routeParams).forEach((key: string) => {
      url = url.replace(new RegExp(":" + key + "(\/|$)", "g"), routeParams[key] + "$1")
    });
    if (pubsub) {
      if (url.match(/fk/)) {
        let arr = url.split('/'); arr.pop();
        url = arr.join('/');
      }
      let event: string = (`[${method}]${url}`).replace(/\?/, '');
      let subject: Subject<any> = new Subject<any>();
      this.connection.on(event, (res: any) => subject.next(res));
      return subject.asObservable();
    } else {
      let httpParams = new HttpParams({ encoder: new CustomQueryEncoderHelper() });
      // Headers to be sent
      let headers: HttpHeaders = new HttpHeaders();
      headers = headers.append('Content-Type', 'application/json');
      // Authenticate request
      headers = this.authenticate(url, headers);
      // Body fix for built in remote methods using "data", "options" or "credentials
      // that are the actual body, Custom remote method properties are different and need
      // to be wrapped into a body object
      let body: any;
      let postBodyKeys = typeof postBody === 'object' ? Object.keys(postBody) : []
      if (postBodyKeys.length === 1) {
        body = postBody[postBodyKeys.shift()];
      } else {
        body = postBody;
      }
      
      let queryString: string = '';

      // Separate filter object from url params and add to search query
      if (urlParams.filter) {
        if (LoopBackConfig.isHeadersFilteringSet()) {
          headers = headers.append('filter', JSON.stringify(urlParams.filter));
        } else {
          queryString = `?filter=${encodeURIComponent(JSON.stringify(urlParams.filter))}`;
        }
        delete urlParams.filter;
      }

      // Separate where object from url params and add to search query
      if (urlParams.where) {
        if (LoopBackConfig.isHeadersWhereSet()) {
          /**
          CODE BELOW WILL GENERATE THE FOLLOWING ISSUES:
          - https://github.com/mean-expert-official/loopback-sdk-builder/issues/356
          - https://github.com/mean-expert-official/loopback-sdk-builder/issues/328 
          **/
          headers = headers.append('where', JSON.stringify(urlParams.where));
        } else {
          queryString = `?where=${encodeURIComponent(JSON.stringify(urlParams.where))}`;
        }
        delete urlParams.where;
      }
    
      if (typeof customHeaders === 'function') {
        headers = customHeaders(headers);
      }
/* enhancement/configure-where-headers
      this.searchParams.setJSON(urlParams);
      let request: Request = new Request(
        new RequestOptions({
          headers        : headers,
          method         : method,
          url            : `${url}${queryString}`,
          search         : Object.keys(urlParams).length > 0 ? this.searchParams.getURLSearchParams() : null,
          body           : body ? JSON.stringify(body) : undefined,
          withCredentials: LoopBackConfig.getRequestOptionsCredentials()
        })
      );
TODO Fix Merge Conflict */
      Object.keys(urlParams).forEach(paramKey => {
        let paramValue = urlParams[paramKey];
        paramValue = typeof paramValue === 'object' ? JSON.stringify(paramValue) : paramValue;
        httpParams = httpParams.append(paramKey, paramValue);
      });
      let request = new HttpRequest(method, `${url}${queryString}`, body, {
        headers        : headers,
        params         : httpParams,
        withCredentials: LoopBackConfig.getRequestOptionsCredentials()
      });
      return this.http.request(request).pipe(
        filter(event => event instanceof HttpResponse),
        map((res: HttpResponse<any>) => res.body),
        catchError((e) => this.errorHandler.handleError(e))
      );
    }
  }
  /**
   * @method authenticate
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @param {string} url Server URL
   * @param {Headers} headers HTTP Headers
   * @return {void}
   * @description
   * This method will try to authenticate using either an access_token or basic http auth
   */
  public authenticate<T>(url: string, headers: HttpHeaders): HttpHeaders {
    if (this.auth.getAccessTokenId()) {
      headers = headers.append(
        'Authorization',
        LoopBackConfig.getAuthPrefix() + this.auth.getAccessTokenId()
      );
    }

    return headers;
  }
  /**
   * @method create
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @param {T} data Generic data type
   * @return {Observable<T>}
   * @description
   * Generic create method
   */
  public create<T>(data: T, customHeaders?: Function): Observable<T> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path
    ].join('/'), undefined, undefined, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onCreate
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @param {T[]} data Generic data type array
   * @return {Observable<T[]>}
   * @description
   * Generic pubsub oncreate many method
   */
  public onCreate<T>(data: T[]): Observable<T[]> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path
    ].join('/'), undefined, undefined, { data }, true)
    .pipe(map((datum: T[]) => datum.map((data: T) => this.model.factory(data))));
  }
  /**
   * @method createMany
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @param {T[]} data Generic data type array
   * @return {Observable<T[]>}
   * @description
   * Generic create many method
   */
  public createMany<T>(data: T[], customHeaders?: Function): Observable<T[]> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path
    ].join('/'), undefined, undefined, { data }, null, customHeaders)
    .pipe(map((datum: T[]) => datum.map((data: T) => this.model.factory(data))));
  }
  /**
   * @method onCreateMany
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @param {T[]} data Generic data type array
   * @return {Observable<T[]>}
   * @description
   * Generic create many method
   */
  public onCreateMany<T>(data: T[]): Observable<T[]> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path
    ].join('/'), undefined, undefined, { data }, true)
    .pipe(map((datum: T[]) => datum.map((data: T) => this.model.factory(data))));
  }
  /**
   * @method findById
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @param {any} data Generic data type
   * @return {Observable<T>}
   * @description
   * Generic findById method
   */
  public findById<T>(id: any, filter: LoopBackFilter = {}, customHeaders?: Function): Observable<T> {
    let _urlParams: any = {};
    if (filter) _urlParams.filter = filter;
    return this.request('GET', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id'
    ].join('/'), { id }, _urlParams, undefined, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method find
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T[+>}
   * @description
   * Generic find method
   */
  public find<T>(filter: LoopBackFilter = {}, customHeaders?: Function): Observable<T[]> {
    return this.request('GET', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path
    ].join('/'), undefined, { filter }, undefined, null, customHeaders)
    .pipe(map((datum: T[]) => datum.map((data: T) => this.model.factory(data))));
  }
  /**
   * @method exists
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T[]>}
   * @description
   * Generic exists method
   */
  public exists<T>(id: any, customHeaders?: Function): Observable<T> {
    return this.request('GET', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id/exists'
    ].join('/'), { id }, undefined, undefined, null, customHeaders);
  }
  /**
   * @method findOne
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic findOne method
   */
  public findOne<T>(filter: LoopBackFilter = {}, customHeaders?: Function): Observable<T> {
    return this.request('GET', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'findOne'
    ].join('/'), undefined, { filter }, undefined, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method updateAll
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T[]>}
   * @description
   * Generic updateAll method
   */
  public updateAll<T>(where: any = {}, data: T, customHeaders?: Function): Observable<{ count: 'number' }> {
    let _urlParams: any = {};
    if (where) _urlParams.where = where;
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'update'
    ].join('/'), undefined, _urlParams, { data }, null, customHeaders);
  }
  /**
   * @method onUpdateAll
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T[]>}
   * @description
   * Generic pubsub onUpdateAll method
   */
  public onUpdateAll<T>(where: any = {}, data: T): Observable<{ count: 'number' }> {
    let _urlParams: any = {};
    if (where) _urlParams.where = where;
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'update'
    ].join('/'), undefined, _urlParams, { data }, true);
  }
  /**
   * @method deleteById
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic deleteById method
   */
  public deleteById<T>(id: any, customHeaders?: Function): Observable<T> {
    return this.request('DELETE', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id'
    ].join('/'), { id }, undefined, undefined, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onDeleteById
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic pubsub onDeleteById method
   */
  public onDeleteById<T>(id: any): Observable<T> {
    return this.request('DELETE', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id'
    ].join('/'), { id }, undefined, undefined, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method count
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<{ count: number }>}
   * @description
   * Generic count method
   */
  public count(where: any = {}, customHeaders?: Function): Observable<{ count: number }> {
    let _urlParams: any = {};
    if (where) _urlParams.where = where;
    return this.request('GET', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'count'
    ].join('/'), undefined, _urlParams, undefined, null, customHeaders);
  }
  /**
   * @method updateAttributes
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic updateAttributes method
   */
  public updateAttributes<T>(id: any, data: T, customHeaders?: Function): Observable<T> {
    return this.request('PUT', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id'
    ].join('/'), { id }, undefined, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onUpdateAttributes
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic onUpdateAttributes method
   */
  public onUpdateAttributes<T>(id: any, data: T): Observable<T> {
    return this.request('PUT', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id'
    ].join('/'), { id }, undefined, { data }, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method upsert
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic upsert method
   */
  public upsert<T>(data: any = {}, customHeaders?: Function): Observable<T> {
    return this.request('PUT', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
    ].join('/'), undefined, undefined, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onUpsert
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic pubsub onUpsert method
   */
  public onUpsert<T>(data: any = {}): Observable<T> {
    return this.request('PUT', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
    ].join('/'), undefined, undefined, { data }, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method upsertPatch
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic upsert method using patch http method
   */
  public upsertPatch<T>(data: any = {}, customHeaders?: Function): Observable<T> {
    return this.request('PATCH', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
    ].join('/'), undefined, undefined, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onUpsertPatch
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic pubsub onUpsertPatch method using patch http method
   */
  public onUpsertPatch<T>(data: any = {}): Observable<T> {
    return this.request('PATCH', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
    ].join('/'), undefined, undefined, { data }, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method upsertWithWhere
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic upsertWithWhere method
   */
  public upsertWithWhere<T>(where: any = {}, data: any = {}, customHeaders?: Function): Observable<T> {
    let _urlParams: any = {};
    if (where) _urlParams.where = where;
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'upsertWithWhere'
    ].join('/'), undefined, _urlParams, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onUpsertWithWhere
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic pubsub onUpsertWithWhere method
   */
  public onUpsertWithWhere<T>(where: any = {}, data: any = {}): Observable<T> {
    let _urlParams: any = {};
    if (where) _urlParams.where = where;
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'upsertWithWhere'
    ].join('/'), undefined, _urlParams, { data }, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method replaceOrCreate
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic replaceOrCreate method
   */
  public replaceOrCreate<T>(data: any = {}, customHeaders?: Function): Observable<T> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'replaceOrCreate'
    ].join('/'), undefined, undefined, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onReplaceOrCreate
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic onReplaceOrCreate method
   */
  public onReplaceOrCreate<T>(data: any = {}): Observable<T> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      'replaceOrCreate'
    ].join('/'), undefined, undefined, { data }, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method replaceById
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic replaceById method
   */
  public replaceById<T>(id: any, data: any = {}, customHeaders?: Function): Observable<T> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id', 'replace'
    ].join('/'), { id }, undefined, { data }, null, customHeaders)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method onReplaceById
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<T>}
   * @description
   * Generic onReplaceById method
   */
  public onReplaceById<T>(id: any, data: any = {}): Observable<T> {
    return this.request('POST', [
      LoopBackConfig.getPath(),
      LoopBackConfig.getApiVersion(),
      this.model.getModelDefinition().path,
      ':id', 'replace'
    ].join('/'), { id }, undefined, { data }, true)
    .pipe(map((data: T) => this.model.factory(data)));
  }
  /**
   * @method createChangeStream
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {Observable<any>}
   * @description
   * Generic createChangeStream method
   */
  public createChangeStream(): Observable<any> {
    let subject = new Subject();
    if (typeof EventSource !== 'undefined') {
      let emit   = (msg: any) => subject.next(JSON.parse(msg.data));
      var source = new EventSource([
        LoopBackConfig.getPath(),
        LoopBackConfig.getApiVersion(),
        this.model.getModelDefinition().path,
        'change-stream'
      ].join('/'));
      source.addEventListener('data', emit);
      source.onerror = emit;
    } else {
      console.warn('SDK Builder: EventSource is not supported'); 
    }
    return subject.asObservable();
  }
  /**
   * @method getModelName
   * @author Jonathan Casarrubias <t: johncasarrubias, gh: mean-expert-official>
   * @license MIT
   * @return {string}
   * @description
   * Abstract getModelName method
   */
  abstract getModelName(): string;
}
