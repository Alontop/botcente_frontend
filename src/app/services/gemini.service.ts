import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface ApiResponse {
  respuesta: string;
  error?: string;
  detalle?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly API_URL = 'https://botcente-backend.onrender.com/api';

  constructor(private http: HttpClient) {}

  enviarChatbot(
    mensaje: string,
    historial: any[] = [],
  ): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/chatbot`, {
      mensaje,
      historial,
    });
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

  evaluarTarea(
    textoEstudiante?: string,
    archivo?: File,
    historial: any[] = [],
  ): Observable<ApiResponse> {
    return from(
      this.prepararFormData(textoEstudiante, archivo, historial),
    ).pipe(
      switchMap((formData) =>
        this.http.post<ApiResponse>(`${this.API_URL}/evaluar-tarea`, formData),
      ),
    );
  }

  private async prepararFormData(
    textoEstudiante?: string,
    archivo?: File,
    historial: any[] = [],
  ): Promise<FormData> {
    const formData = new FormData();

    if (textoEstudiante) {
      formData.append('textoEstudiante', textoEstudiante);
    }

    if (archivo) {
      formData.append('archivo', archivo);
    }

    const historialProcesado = [...historial];

    if (archivo && archivo.type.startsWith('image/')) {
      const base64 = await this.convertirArchivoABase64(archivo);
      if (historialProcesado.length > 0) {
        const ultimoIndice = historialProcesado.length - 1;
        historialProcesado[ultimoIndice] = {
          ...historialProcesado[ultimoIndice],
          imagenBase64: base64,
          mimeType: archivo.type,
        };
      }
    }

    formData.append('historial', JSON.stringify(historialProcesado));

    return formData;
  }
}
