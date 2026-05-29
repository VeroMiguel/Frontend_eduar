// orden-form.component.ts
import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrdenService } from '../../../../core/services/orden.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { ServicioService } from '../../../../core/services/servicio.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ConfigService } from '../../../../core/services/config.service';
import Swal from 'sweetalert2';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ImagenPipe } from '../../../../shared/pipes/imagen.pipe';
import { HoraPipe } from 'src/app/shared/pipes/hora.pipe';

@Component({
  selector: 'app-orden-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SearchableSelectComponent, ImagenPipe, HoraPipe],
  templateUrl: './orden-form.component.html',
  styleUrls: ['./orden-form.component.css']
})
export class OrdenFormComponent implements OnInit {
  ordenForm: FormGroup;
  doctores: any[] = [];
  servicios: any[] = [];
  esEdicion = false;
  ordenId?: number;

  imagenSeleccionada: File | null = null;
  previewUrl: string | null = null;
  subiendoImagen = false;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private ordenService: OrdenService,
    private doctorService: DoctorService,
    private servicioService: ServicioService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private configService: ConfigService,
    private cdr: ChangeDetectorRef  // ✅ AGREGAR ESTO
  ) {
    this.ordenForm = this.fb.group({
      doctor_id: ['', Validators.required],
      servicio_id: ['', Validators.required],
      total: ['', [Validators.required, Validators.min(0)]],
      pago_inicial: [0, [Validators.min(0)]],
      prioridad: ['normal'],
      fecha_limite: [''],
      hora_limite: [''],
      cliente_nombre: [''],
      detalle_cliente: [''],
    });
  }

ngOnInit() {
  // ✅ PRIMERO: Cargar doctores y servicios
  this.cargarDoctores();
  this.cargarServicios();

  this.route.params.subscribe(params => {
    if (params['id']) {
      this.esEdicion = true;
      this.ordenId = +params['id'];
      // ✅ ESPERAR a que se carguen doctores y servicios antes de cargar la orden
      this.cargarOrdenCuandoListo();
    }
  });
}

// ✅ Nuevo método: Esperar a que doctores y servicios estén listos
private cargarOrdenCuandoListo() {
  // Verificar cada 500ms si doctores y servicios están cargados
  const intervalId = setInterval(() => {
    if (this.doctores.length > 0 && this.servicios.length > 0) {
      clearInterval(intervalId);
      console.log('✅ Doctores y servicios cargados, procediendo a cargar orden...');
      this.cargarOrden();
    }
  }, 100);
  
  // Timeout después de 5 segundos para no quedar en loop infinito
  setTimeout(() => {
    clearInterval(intervalId);
    if (this.doctores.length === 0 || this.servicios.length === 0) {
      console.error('❌ Timeout cargando doctores/servicios');
      this.cargarOrden(); // Intentar cargar igualmente
    }
  }, 5000);
}

cargarDoctores() {
  this.doctorService.getDoctores().subscribe({
    next: (data) => {
      this.doctores = data;
      console.log('📋 Doctores cargados:', this.doctores.length);
    },
    error: (error) => console.error('Error cargando doctores:', error)
  });
}

cargarServicios() {
  this.servicioService.getServicios().subscribe({
    next: (data) => {
      this.servicios = data;
      console.log('📋 Servicios cargados:', this.servicios.length);
    },
    error: (error) => console.error('Error cargando servicios:', error)
  });
}

cargarOrden() {
  if (!this.ordenId) return;
  
  this.ordenService.getOrden(this.ordenId).subscribe({
    next: (orden) => {
      const totalPagado = orden.pagos?.reduce((sum, pago) => sum + Number(pago.monto), 0) || 0;
      
      let fechaLimiteFormateada = '';
      if (orden.fecha_limite) {
        const fecha = new Date(orden.fecha_limite);
        fechaLimiteFormateada = this.formatearFechaParaInput(fecha);
      }
      
      // ✅ Verificar que los valores existen en las listas
      const doctorExiste = this.doctores.some(d => d.id === orden.doctor_id);
      const servicioExiste = this.servicios.some(s => s.id === orden.servicio_id);
      
      console.log('📝 Cargando orden para editar:', {
        doctor_id: orden.doctor_id,
        servicio_id: orden.servicio_id,
        doctorExiste,
        servicioExiste,
        doctoresDisponibles: this.doctores.map(d => ({ id: d.id, nombre: d.nombre })),
        serviciosDisponibles: this.servicios.map(s => ({ id: s.id, nombre: s.nombre }))
      });
      
      this.ordenForm.patchValue({
        doctor_id: orden.doctor_id,
        servicio_id: orden.servicio_id,
        total: orden.total,
        pago_inicial: totalPagado,
        prioridad: orden.prioridad,
        fecha_limite: fechaLimiteFormateada,
        hora_limite: orden.hora_limite,
        cliente_nombre: orden.cliente_nombre,
        detalle_cliente: orden.detalle_cliente
      });

      // Cargar la imagen de referencia existente
      if (orden.imagen_referencia_url) {
        // ✅ Construir URL completa para la imagen
        const baseUrl = 'http://localhost:3000';
        this.previewUrl = `${baseUrl}${orden.imagen_referencia_url}`;
        console.log('🖼️ Imagen de referencia cargada:', this.previewUrl);
      }
      
      // Forzar actualización de la vista
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error cargando orden:', error);
      Swal.fire('Error', 'No se pudo cargar la orden', 'error');
    }
  });
}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      console.log('📁 Archivo seleccionado:', {
        nombre: file.name,
        tamaño: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        tipo: file.type
      });
      
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        Swal.fire({
          icon: 'error',
          title: 'Imagen muy grande',
          text: `La imagen no puede superar los 10MB. Actualmente pesa ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
          confirmButtonColor: '#f43f5e'
        });
        this.fileInput.nativeElement.value = '';
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif'];
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
        Swal.fire({
          icon: 'error',
          title: 'Formato no soportado',
          text: 'Formatos permitidos: JPG, JPEG, PNG, GIF, WEBP, AVIF, HEIC',
          confirmButtonColor: '#f43f5e'
        });
        this.fileInput.nativeElement.value = '';
        return;
      }

      this.imagenSeleccionada = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removerImagen() {
    this.imagenSeleccionada = null;
    this.previewUrl = null;
  }

  private formatearFechaParaInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatearFechaParaBackend(fecha: string): string {
    if (!fecha) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return fecha;
    }
    const date = new Date(fecha);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ✅ Método auxiliar para obtener el valor seguro de un control
  private getControlValue(controlName: string): any {
    const control = this.ordenForm.get(controlName);
    return control ? control.value : null;
  }

  // ✅ También modifica el método onSubmit para asegurar que la imagen se actualice correctamente
  onSubmit() {
    if (this.ordenForm.valid) {
      const formValue = { ...this.ordenForm.value };
      
      if (formValue.fecha_limite) {
        formValue.fecha_limite = this.formatearFechaParaBackend(formValue.fecha_limite);
      } else {
        formValue.fecha_limite = null;
        formValue.hora_limite = null;
      }
      
      if (formValue.pago_inicial === '' || formValue.pago_inicial === null) {
        formValue.pago_inicial = 0;
      }
      
      if (this.esEdicion && this.ordenId) {
        // ACTUALIZAR ORDEN
        const updateData = { ...formValue };
        
        console.log('📝 Enviando actualización:', {
          id: this.ordenId,
          updateData,
          tieneNuevaImagen: !!this.imagenSeleccionada
        });
        
        // ✅ IMPORTANTE: Eliminar campos undefined o null que puedan causar problemas
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        if (this.imagenSeleccionada) {
          // Si hay una nueva imagen, usar FormData
          const formData = new FormData();
          
          // Agregar todos los campos excepto la imagen (se agrega aparte)
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== null && updateData[key] !== undefined && updateData[key] !== '') {
              formData.append(key, String(updateData[key]));
            }
          });
          formData.append('imagen_referencia', this.imagenSeleccionada);
          
          this.subiendoImagen = true;
          this.ordenService.actualizarOrdenConImagen(this.ordenId, formData).subscribe({
            next: (respuesta: any) => {
              this.subiendoImagen = false;
              Swal.fire('¡Éxito!', 'Orden actualizada correctamente', 'success');
              this.router.navigate(['/ordenes', this.ordenId]);
            },
            error: (error: any) => {
              this.subiendoImagen = false;
              console.error('Error actualizando orden:', error);
              Swal.fire('Error', 'No se pudo actualizar la orden', 'error');
            }
          });
        } else {
          // Sin nueva imagen, usar PUT normal
          this.subiendoImagen = true;
          this.ordenService.actualizarOrden(this.ordenId, updateData).subscribe({
            next: (respuesta: any) => {
              this.subiendoImagen = false;
              Swal.fire('¡Éxito!', 'Orden actualizada correctamente', 'success');
              this.router.navigate(['/ordenes', this.ordenId]);
            },
            error: (error: any) => {
              this.subiendoImagen = false;
              console.error('Error actualizando orden:', error);
              Swal.fire('Error', 'No se pudo actualizar la orden', 'error');
            }
          });
        }
      } else {
        // CREAR NUEVA ORDEN
        const formData = new FormData();
        Object.keys(formValue).forEach(key => {
          if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
            formData.append(key, formValue[key]);
          }
        });

        if (this.imagenSeleccionada) {
          formData.append('imagen_referencia', this.imagenSeleccionada);
        }

        this.ordenService.crearOrdenConImagen(formData).subscribe({
          next: (respuesta: any) => {
            this.subiendoImagen = false;
            
            let ordenCreada = respuesta.orden;
            
            if (!ordenCreada && respuesta.mensaje) {
              console.warn('⚠️ Backend no devolvió orden completa, construyendo manualmente...');
              
              // ✅ CORREGIDO: Usar getControlValue para evitar errores de null
              const doctorId = this.getControlValue('doctor_id');
              const servicioId = this.getControlValue('servicio_id');
              
              console.log('🔍 Buscando doctor con ID:', doctorId);
              console.log('🔍 Buscando servicio con ID:', servicioId);
              console.log('📋 Doctores disponibles:', this.doctores);
              console.log('📋 Servicios disponibles:', this.servicios);
              
              ordenCreada = {
                id: 'nueva',
                id_externo: `ORD-${Date.now()}`,
                doctor: this.doctores.find(d => d && d.id == doctorId) || null,
                servicio: this.servicios.find(s => s && s.id == servicioId) || null,
                fecha_limite: formValue.fecha_limite,
                hora_limite: formValue.hora_limite,
                cliente_nombre: formValue.cliente_nombre,
                total: formValue.total
              };
              console.log('📦 Orden construida manualmente:', ordenCreada);
            }
            
            this.programarNotificacionSiCorresponde(ordenCreada || formValue);
            Swal.fire('¡Éxito!', 'Orden creada correctamente', 'success');
            this.router.navigate(['/ordenes']);
          },
          error: (error: any) => {
            this.subiendoImagen = false;
            console.error('Error creando orden:', error);
            Swal.fire('Error', 'No se pudo crear la orden', 'error');
          }
        });
      }
    } else {
      Object.keys(this.ordenForm.controls).forEach(key => {
        const control = this.ordenForm.get(key);
        if (control?.invalid) {
          console.log(`Campo inválido: ${key}`, control.errors);
        }
      });
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
    }
  }

 private async programarNotificacionSiCorresponde(orden: any): Promise<void> {
  console.log('🔔 [DEBUG] programarNotificacionSiCorresponde llamado con:', orden);
  
  if (!orden?.fecha_limite) {
    console.log('⚠️ Orden sin fecha límite, no se programan notificaciones');
    return;
  }

  console.log(`📅 Fecha límite: ${orden.fecha_limite}, Hora: ${orden.hora_limite}`);

  const tienePermiso = await this.notificationService.solicitarPermiso();
  console.log(`📢 ¿Tiene permiso? ${tienePermiso}`);
  
  if (!tienePermiso) {
    console.warn('⚠️ Sin permiso para notificaciones');
    Swal.fire({
      icon: 'warning',
      title: 'Notificaciones bloqueadas',
      html: `Para recibir alertas en tu celular, permite las notificaciones en la configuración del navegador.`,
      confirmButtonColor: '#6366f1'
    });
    return;
  }

  // ✅ IMPORTANTE: Usar AWAIT porque la función es ASYNC
  const resultado = await this.notificationService.programarNotificacionOrden({
    id: orden.id ?? orden.id_externo ?? 'nueva',
    id_externo: orden.id_externo ?? `#${orden.id}`,
    fecha_limite: orden.fecha_limite,
    hora_limite: orden.hora_limite,
    doctor: orden.doctor,
    servicio: orden.servicio,
    cliente_nombre: orden.cliente_nombre
  });

  console.log('📊 Resultado programación:', resultado);

  if (resultado.programadas > 0) {
    console.log(`🔔 ${resultado.mensaje}`);
    
    const minutos = this.configService.config.tiempoNotificacionAnticipada;
    const anticipacionTexto = minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)} h`;

    const Toast = Swal.mixin({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true
    });
    Toast.fire({
      icon: 'success',
      title: '🔔 Notificaciones programadas',
      html: resultado.programadas === 2
        ? `A la hora exacta y <strong>${anticipacionTexto} antes</strong>`
        : resultado.mensaje
    });
  }
}
}