import {Injectable} from '@angular/core';
import {Observable, timer} from 'rxjs';
import {delay, delayWhen, finalize, flatMap, map, retryWhen, share, tap} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EventSourceService {
  public static PROCESSING = 'processing';
  public static CLOSED = 'closed';
  /*
  Used to store all event Source occurances by url and destroy them on unsubscribe call
  to prevent memory leak
  https://brianflove.com/2016/12/11/anguar-2-unsubscribe-observables/
   */
  private eventSourcesMap = {};

  private initializeMapForUrl(url) {
      if (!this.eventSourcesMap[url]) {
          this.eventSourcesMap[url] = []
      }
  }
  connectToStream(url: string): Observable<any> {
     this.initializeMapForUrl(url);
      return new Observable((observer) => {
          const EventSource = window['EventSource'];
          const eventSource = new EventSource(url);
          this.eventSourcesMap[url].push(eventSource);
          eventSource.onmessage = (event) => {
              const json = JSON.parse(event.data);
              if (json.data !== 'connected') {
                  observer.next([json, eventSource]);
              }
          };
          eventSource.onerror = (error) => {
              console.error(error);
              eventSource.close();
              observer.error(error);
          };
      }).pipe(
          retryWhen(errors => {
                  return errors.pipe(
                      tap(val => console.log(`Value ${val} was too high!`)),
                      delayWhen(val => timer(3000)),
                      map(e => {
                          console.log('Retry Event Source Connection')
                          return e;
                      })
                  )
          }),
          finalize(() => {
              // Will be called on last subscriber unsubscribe
              this.destroyAllEventSourcesForUrl(url)
          }),
          share()
      );
  }

    private destroyAllEventSourcesForUrl(url) {
       this.eventSourcesMap[url].forEach(eventSource => {
           if (eventSource) {
            eventSource.close()
           }
       });
       this.eventSourcesMap[url] = [];
    }
}
