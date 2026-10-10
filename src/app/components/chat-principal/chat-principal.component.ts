import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Mensaje {
  emisor: 'bot' | 'usuario';
  texto?: string;
  archivoNombre?: string;
  imagenBase64?: string | null;
  mimeType?: string | null;
  fecha: Date;
}

type ModoActual = 'menu' | 'chat' | 'evaluar';

@Component({
  selector: 'app-chat-principal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './chat-principal.component.html',
})
export class ChatPrincipalComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  historial: Mensaje[] = [];
  modoActivo: ModoActual = 'menu';

  mensajeTexto: string = '';
  archivoSeleccionado: File | null = null;
  cargando: boolean = false;

  constructor(private geminiService: GeminiService) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop =
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  seleccionarOpcion(modo: 'chat' | 'evaluar'): void {
    this.modoActivo = modo;

    if (modo === 'chat') {
      this.historial.push({
        emisor: 'bot',
        texto:
          '¡Genial! Estoy listo para responder tus dudas pedagógicas o darte pistas sobre tus tareas. ¿En qué puedo ayudarte hoy?',
        fecha: new Date(),
      });
    } else if (modo === 'evaluar') {
      this.historial.push({
        emisor: 'bot',
        texto:
          'Perfecto. Escribe el texto de tu tarea o adjunta una foto/PDF para revisarlo juntos.',
        fecha: new Date(),
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado = input.files[0];
    }
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
  }

  private convertirArchivoABase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  onKeydownEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.enviar();
    }
  }

  enviar(): void {
    if (this.cargando || this.modoActivo === 'menu') return;

    if (this.modoActivo === 'chat') {
      this.enviarChatbot();
    } else if (this.modoActivo === 'evaluar') {
      this.enviarEvaluacion();
    }
  }

  private enviarChatbot(): void {
    if (!this.mensajeTexto.trim()) return;

    const historialPrevio = [...this.historial];

    const textoUsuario = this.mensajeTexto;
    this.historial.push({
      emisor: 'usuario',
      texto: textoUsuario,
      fecha: new Date(),
    });

    this.mensajeTexto = '';
    this.cargando = true;

    this.geminiService.enviarChatbot(textoUsuario, historialPrevio).subscribe({
      next: (res) => {
        this.historial.push({
          emisor: 'bot',
          texto: res.respuesta,
          fecha: new Date(),
        });
        this.cargando = false;
      },
      error: (err) => {
        this.historial.push({
          emisor: 'bot',
          texto:
            'Ocurrió un problema al comunicarme con mi servidor. Por favor intenta de nuevo.',
          fecha: new Date(),
        });
        this.cargando = false;
      },
    });
  }

  private async enviarEvaluacion(): Promise<void> {
    if (!this.mensajeTexto.trim() && !this.archivoSeleccionado) return;

    const textoUsuario = this.mensajeTexto;
    const archivo = this.archivoSeleccionado;

    let imagenBase64: string | null = null;
    let mimeType: string | null = null;

    if (archivo && archivo.type.startsWith('image/')) {
      imagenBase64 = await this.convertirArchivoABase64(archivo);
      mimeType = archivo.type;
    }

    this.historial.push({
      emisor: 'usuario',
      texto: textoUsuario,
      archivoNombre: archivo ? archivo.name : undefined,
      imagenBase64: imagenBase64,
      mimeType: mimeType,
      fecha: new Date(),
    });

    const historialAEnviar = [...this.historial.slice(0, -1)];

    this.mensajeTexto = '';
    this.archivoSeleccionado = null;
    this.cargando = true;

    this.geminiService
      .evaluarTarea(textoUsuario, archivo || undefined, historialAEnviar)
      .subscribe({
        next: (res) => {
          this.historial.push({
            emisor: 'bot',
            texto: res.respuesta,
            fecha: new Date(),
          });
          this.cargando = false;
        },
        error: (err) => {
          this.historial.push({
            emisor: 'bot',
            texto: 'Ocurrió un error al procesar y evaluar la tarea.',
            fecha: new Date(),
          });
          this.cargando = false;
        },
      });
  }

  reiniciarFlujo(): void {
    this.modoActivo = 'menu';
    this.historial = [];
    this.mensajeTexto = '';
    this.archivoSeleccionado = null;
  }
}
