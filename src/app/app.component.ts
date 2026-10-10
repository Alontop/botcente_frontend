import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatPrincipalComponent } from './components/chat-principal/chat-principal.component';

@Component({
  selector: 'app-root',
  imports: [ChatPrincipalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'frontend';
}
