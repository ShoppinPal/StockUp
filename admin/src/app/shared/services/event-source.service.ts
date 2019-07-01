import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventSourceService {
  public static PROCESSING = 'processing';
  public static CLOSED = 'closed';

  connectToStream(url: string): Observable<any> {
    return new Observable((observer) => {
     const EventSource = window['EventSource'];
     const eventSource = new EventSource(url);
     eventSource.onmessage = (event) => {
       console.log('Event Received');
       const json = JSON.parse(event.data);
       observer.next(json);
     };
     eventSource.onerror = (error) => {
       // readyState === 0 (closed) means the remote source closed the connection,
       // so we can safely treat it as a normal situation. Another way of detecting the end of the stream
       // is to insert a special element in the stream of events, which the client can identify as the last one.
       if (eventSource.readyState === 0) {
         console.log('The stream has been closed by the server.');
         eventSource.close();
         observer.complete();
       } else {
         observer.error('EventSource error: ' + error);
       }
     };
   });
  }
}
