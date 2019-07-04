import {Injectable} from '@angular/core';
import {Observable, timer} from 'rxjs';
import {delayWhen, finalize, flatMap, map, retryWhen, share, tap} from 'rxjs/operators';

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
  connectToStream(url: string, retry = false): Observable<any> {
     this.initializeMapForUrl(url);
      return new Observable((observer) => {
          const EventSource = window['EventSource'];
          const eventSource = new EventSource(url);
          this.eventSourcesMap[url].push(eventSource);
          eventSource.onmessage = (event) => {
              const json = JSON.parse(event.data);
              observer.next([json, eventSource]);
          };
          eventSource.onerror = (error) => {
              // readyState === 0 (closed) means the remote source closed the connection,
              // so we can safely treat it as a normal situation. Another way of detecting the end of the stream
              // is to insert a special element in the stream of events, which the client can identify as the last one.
              if (eventSource.readyState === 0) {
                  console.log('The stream has been closed by the server.');
                  eventSource.close();
                  if (!retry) {
                      observer.complete();
                      this.destroyAllEventSourcesForUrl(url);
                  } else {
                      observer.error(error)
                  }
              } else {
                  observer.error(error);
              }
          };
      }).pipe(
          retryWhen(errors => {
              if (retry) {
                  return errors.pipe(
                      tap(val => console.log(`Value ${val} was too high!`)),
                      delayWhen(val => timer(val * 1000)),
                      map(e => {
                          console.log('Retry Event Source Connection')
                          return e;
                      })
                  )
              }
          }),
          finalize(() => {
              // Will be called on last subscriber unsubscribe
              this.destroyAllEventSourcesForUrl(url)
          }),
          share()
      );
  }

    private destroyAllEventSourcesForUrl(url) {
      console.log('destroying all events', url);
       this.eventSourcesMap[url].forEach(eventSource => {
           if (eventSource) {
            eventSource.close()
           }
       });
       this.eventSourcesMap[url] = [];
    }
}
