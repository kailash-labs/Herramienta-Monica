export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      aforo_adjuntos: {
        Row: {
          archivo_nombre: string | null
          estado: Database["public"]["Enums"]["estado_adjunto"]
          id: string
          mime_type: string | null
          nota: string | null
          origen: Database["public"]["Enums"]["origen_adjunto"]
          semana_id: string
          storage_path: string
          subido_at: string
          subido_por: string | null
          tamano_bytes: number | null
          tienda_id: string
        }
        Insert: {
          archivo_nombre?: string | null
          estado?: Database["public"]["Enums"]["estado_adjunto"]
          id?: string
          mime_type?: string | null
          nota?: string | null
          origen?: Database["public"]["Enums"]["origen_adjunto"]
          semana_id: string
          storage_path: string
          subido_at?: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tienda_id: string
        }
        Update: {
          archivo_nombre?: string | null
          estado?: Database["public"]["Enums"]["estado_adjunto"]
          id?: string
          mime_type?: string | null
          nota?: string | null
          origen?: Database["public"]["Enums"]["origen_adjunto"]
          semana_id?: string
          storage_path?: string
          subido_at?: string
          subido_por?: string | null
          tamano_bytes?: number | null
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aforo_adjuntos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aforo_adjuntos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id"]
          },
          {
            foreignKeyName: "aforo_adjuntos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "aforo_adjuntos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id", "tienda_id"]
          },
          {
            foreignKeyName: "aforo_adjuntos_subido_por_fkey"
            columns: ["subido_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aforo_adjuntos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          asunto: string
          canal: Database["public"]["Enums"]["canal_alerta"]
          colaborador_id: string | null
          creada_at: string
          cuerpo: string
          destinatario_perfil_id: string | null
          enviada_at: string | null
          enviada_por: string | null
          estado: Database["public"]["Enums"]["estado_alerta"]
          id: string
          origen_id: string | null
          origen_tabla: string | null
          tienda_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
          variables: Json
        }
        Insert: {
          asunto: string
          canal?: Database["public"]["Enums"]["canal_alerta"]
          colaborador_id?: string | null
          creada_at?: string
          cuerpo: string
          destinatario_perfil_id?: string | null
          enviada_at?: string | null
          enviada_por?: string | null
          estado?: Database["public"]["Enums"]["estado_alerta"]
          id?: string
          origen_id?: string | null
          origen_tabla?: string | null
          tienda_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
          variables?: Json
        }
        Update: {
          asunto?: string
          canal?: Database["public"]["Enums"]["canal_alerta"]
          colaborador_id?: string | null
          creada_at?: string
          cuerpo?: string
          destinatario_perfil_id?: string | null
          enviada_at?: string | null
          enviada_por?: string | null
          estado?: Database["public"]["Enums"]["estado_alerta"]
          id?: string
          origen_id?: string | null
          origen_tabla?: string | null
          tienda_id?: string
          tipo?: Database["public"]["Enums"]["tipo_alerta"]
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "alertas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "alertas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "alertas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "alertas_destinatario_perfil_id_fkey"
            columns: ["destinatario_perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_enviada_por_fkey"
            columns: ["enviada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      ausencias: {
        Row: {
          causa: Database["public"]["Enums"]["causa_ausencia"] | null
          colaborador_id: string
          created_at: string
          descripcion: string | null
          dias: number | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          registrada_por: string | null
          soporte_url: string | null
          tienda_id: string
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Insert: {
          causa?: Database["public"]["Enums"]["causa_ausencia"] | null
          colaborador_id: string
          created_at?: string
          descripcion?: string | null
          dias?: number | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          registrada_por?: string | null
          soporte_url?: string | null
          tienda_id: string
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Update: {
          causa?: Database["public"]["Enums"]["causa_ausencia"] | null
          colaborador_id?: string
          created_at?: string
          descripcion?: string | null
          dias?: number | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          registrada_por?: string | null
          soporte_url?: string | null
          tienda_id?: string
          tipo?: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_tienda_fk"
            columns: ["colaborador_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "ausencias_registrada_por_fkey"
            columns: ["registrada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      cambios_turno: {
        Row: {
          accion: Database["public"]["Enums"]["accion_cambio"]
          ausencia_id: string | null
          colaborador_id: string | null
          datos_antes: Json | null
          datos_despues: Json | null
          delta_minutos: number | null
          fecha_turno: string | null
          hecho_at: string
          hecho_por: string | null
          id: string
          minutos_antes: number | null
          minutos_despues: number | null
          motivo: Database["public"]["Enums"]["motivo_cambio"]
          semana_id: string
          tienda_id: string
          turno_id: string | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["accion_cambio"]
          ausencia_id?: string | null
          colaborador_id?: string | null
          datos_antes?: Json | null
          datos_despues?: Json | null
          delta_minutos?: number | null
          fecha_turno?: string | null
          hecho_at?: string
          hecho_por?: string | null
          id?: string
          minutos_antes?: number | null
          minutos_despues?: number | null
          motivo?: Database["public"]["Enums"]["motivo_cambio"]
          semana_id: string
          tienda_id: string
          turno_id?: string | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["accion_cambio"]
          ausencia_id?: string | null
          colaborador_id?: string | null
          datos_antes?: Json | null
          datos_despues?: Json | null
          delta_minutos?: number | null
          fecha_turno?: string | null
          hecho_at?: string
          hecho_por?: string | null
          id?: string
          minutos_antes?: number | null
          minutos_despues?: number | null
          motivo?: Database["public"]["Enums"]["motivo_cambio"]
          semana_id?: string
          tienda_id?: string
          turno_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cambios_turno_ausencia_id_fkey"
            columns: ["ausencia_id"]
            isOneToOne: false
            referencedRelation: "ausencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_turno_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_turno_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "cambios_turno_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "cambios_turno_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "cambios_turno_hecho_por_fkey"
            columns: ["hecho_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_turno_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_turno_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id"]
          },
          {
            foreignKeyName: "cambios_turno_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          activo: boolean
          codigo: string
          color: string | null
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          codigo: string
          color?: string | null
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          color?: string | null
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          activo: boolean
          cargo_id: string
          codigo_empleado: string | null
          created_at: string
          documento: string | null
          fecha_ingreso: string | null
          fecha_retiro: string | null
          horas_contrato: number
          id: string
          nombre_completo: string
          tienda_id: string
          tipo_jornada: Database["public"]["Enums"]["tipo_jornada"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cargo_id: string
          codigo_empleado?: string | null
          created_at?: string
          documento?: string | null
          fecha_ingreso?: string | null
          fecha_retiro?: string | null
          horas_contrato?: number
          id?: string
          nombre_completo: string
          tienda_id: string
          tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cargo_id?: string
          codigo_empleado?: string | null
          created_at?: string
          documento?: string | null
          fecha_ingreso?: string | null
          fecha_retiro?: string | null
          horas_contrato?: number
          id?: string
          nombre_completo?: string
          tienda_id?: string
          tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      conceptos_nomina: {
        Row: {
          activo: boolean
          clasificacion: Database["public"]["Enums"]["clasificacion_concepto"]
          codigo: string
          created_at: string
          cuenta_como_extra: boolean
          cuenta_como_recargo: boolean
          id: string
          incluir_en_conciliacion: boolean
          nombre: string
        }
        Insert: {
          activo?: boolean
          clasificacion: Database["public"]["Enums"]["clasificacion_concepto"]
          codigo: string
          created_at?: string
          cuenta_como_extra?: boolean
          cuenta_como_recargo?: boolean
          id?: string
          incluir_en_conciliacion?: boolean
          nombre: string
        }
        Update: {
          activo?: boolean
          clasificacion?: Database["public"]["Enums"]["clasificacion_concepto"]
          codigo?: string
          created_at?: string
          cuenta_como_extra?: boolean
          cuenta_como_recargo?: boolean
          id?: string
          incluir_en_conciliacion?: boolean
          nombre?: string
        }
        Relationships: []
      }
      conciliacion_detalle: {
        Row: {
          colaborador_id: string
          comentario: string | null
          conciliacion_id: string
          diferencia_horas: number | null
          estado: Database["public"]["Enums"]["estado_linea_conciliacion"]
          horas_extra_planeadas: number
          horas_extra_reales: number
          horas_recargo_reales: number
          id: string
          valor_extras: number
        }
        Insert: {
          colaborador_id: string
          comentario?: string | null
          conciliacion_id: string
          diferencia_horas?: number | null
          estado: Database["public"]["Enums"]["estado_linea_conciliacion"]
          horas_extra_planeadas?: number
          horas_extra_reales?: number
          horas_recargo_reales?: number
          id?: string
          valor_extras?: number
        }
        Update: {
          colaborador_id?: string
          comentario?: string | null
          conciliacion_id?: string
          diferencia_horas?: number | null
          estado?: Database["public"]["Enums"]["estado_linea_conciliacion"]
          horas_extra_planeadas?: number
          horas_extra_reales?: number
          horas_recargo_reales?: number
          id?: string
          valor_extras?: number
        }
        Relationships: [
          {
            foreignKeyName: "conciliacion_detalle_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliacion_detalle_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "conciliacion_detalle_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "conciliacion_detalle_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "conciliacion_detalle_conciliacion_id_fkey"
            columns: ["conciliacion_id"]
            isOneToOne: false
            referencedRelation: "conciliaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliaciones: {
        Row: {
          anio: number
          estado: Database["public"]["Enums"]["estado_conciliacion"]
          generada_at: string
          generada_por: string | null
          id: string
          mes: number
          reporte_id: string | null
          revisada_at: string | null
          revisada_por: string | null
          tienda_id: string
          tolerancia_horas: number
        }
        Insert: {
          anio: number
          estado?: Database["public"]["Enums"]["estado_conciliacion"]
          generada_at?: string
          generada_por?: string | null
          id?: string
          mes: number
          reporte_id?: string | null
          revisada_at?: string | null
          revisada_por?: string | null
          tienda_id: string
          tolerancia_horas?: number
        }
        Update: {
          anio?: number
          estado?: Database["public"]["Enums"]["estado_conciliacion"]
          generada_at?: string
          generada_por?: string | null
          id?: string
          mes?: number
          reporte_id?: string | null
          revisada_at?: string | null
          revisada_por?: string | null
          tienda_id?: string
          tolerancia_horas?: number
        }
        Relationships: [
          {
            foreignKeyName: "conciliaciones_generada_por_fkey"
            columns: ["generada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "reportes_nomina"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "v_extras_reales"
            referencedColumns: ["reporte_id"]
          },
          {
            foreignKeyName: "conciliaciones_revisada_por_fkey"
            columns: ["revisada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliaciones_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_nomina: {
        Row: {
          cantidad: number
          codigo_concepto_origen: string | null
          codigo_empleado_origen: string | null
          colaborador_id: string | null
          concepto_id: string | null
          created_at: string
          estado_match: Database["public"]["Enums"]["estado_match"]
          fecha_movimiento: string | null
          fila_origen: number | null
          id: string
          nombre_origen: string | null
          raw: Json | null
          reporte_id: string
          tienda_id: string | null
          valor: number
        }
        Insert: {
          cantidad?: number
          codigo_concepto_origen?: string | null
          codigo_empleado_origen?: string | null
          colaborador_id?: string | null
          concepto_id?: string | null
          created_at?: string
          estado_match?: Database["public"]["Enums"]["estado_match"]
          fecha_movimiento?: string | null
          fila_origen?: number | null
          id?: string
          nombre_origen?: string | null
          raw?: Json | null
          reporte_id: string
          tienda_id?: string | null
          valor?: number
        }
        Update: {
          cantidad?: number
          codigo_concepto_origen?: string | null
          codigo_empleado_origen?: string | null
          colaborador_id?: string | null
          concepto_id?: string | null
          created_at?: string
          estado_match?: Database["public"]["Enums"]["estado_match"]
          fecha_movimiento?: string | null
          fila_origen?: number | null
          id?: string
          nombre_origen?: string | null
          raw?: Json | null
          reporte_id?: string
          tienda_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "conceptos_nomina"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_nomina_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "reportes_nomina"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_nomina_reporte_id_fkey"
            columns: ["reporte_id"]
            isOneToOne: false
            referencedRelation: "v_extras_reales"
            referencedColumns: ["reporte_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_tiendas: {
        Row: {
          perfil_id: string
          tienda_id: string
        }
        Insert: {
          perfil_id: string
          tienda_id: string
        }
        Update: {
          perfil_id?: string
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_tiendas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_tiendas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["app_rol"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["app_rol"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["app_rol"]
          updated_at?: string
        }
        Relationships: []
      }
      plantillas_mensaje: {
        Row: {
          activa: boolean
          asunto_tpl: string
          codigo: string
          cuerpo_tpl: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Insert: {
          activa?: boolean
          asunto_tpl: string
          codigo: string
          cuerpo_tpl: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Update: {
          activa?: boolean
          asunto_tpl?: string
          codigo?: string
          cuerpo_tpl?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_alerta"]
        }
        Relationships: []
      }
      reglas: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          parametros: Json
          severidad: Database["public"]["Enums"]["severidad_regla"]
          tienda_id: string | null
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          parametros?: Json
          severidad?: Database["public"]["Enums"]["severidad_regla"]
          tienda_id?: string | null
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          parametros?: Json
          severidad?: Database["public"]["Enums"]["severidad_regla"]
          tienda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reglas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      reportes_nomina: {
        Row: {
          anio: number
          archivo_nombre: string | null
          cargado_at: string
          cargado_por: string | null
          error_detalle: string | null
          estado: Database["public"]["Enums"]["estado_reporte"]
          filas_con_match: number
          filas_totales: number
          id: string
          mes: number
          procesado_at: string | null
          storage_path: string | null
          tienda_id: string | null
        }
        Insert: {
          anio: number
          archivo_nombre?: string | null
          cargado_at?: string
          cargado_por?: string | null
          error_detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_reporte"]
          filas_con_match?: number
          filas_totales?: number
          id?: string
          mes: number
          procesado_at?: string | null
          storage_path?: string | null
          tienda_id?: string | null
        }
        Update: {
          anio?: number
          archivo_nombre?: string | null
          cargado_at?: string
          cargado_por?: string | null
          error_detalle?: string | null
          estado?: Database["public"]["Enums"]["estado_reporte"]
          filas_con_match?: number
          filas_totales?: number
          id?: string
          mes?: number
          procesado_at?: string | null
          storage_path?: string | null
          tienda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reportes_nomina_cargado_por_fkey"
            columns: ["cargado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reportes_nomina_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      semanas: {
        Row: {
          cerrada_at: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_semana"]
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          notas: string | null
          publicada_at: string | null
          publicada_por: string | null
          tienda_id: string
          updated_at: string
        }
        Insert: {
          cerrada_at?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_semana"]
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          notas?: string | null
          publicada_at?: string | null
          publicada_por?: string | null
          tienda_id: string
          updated_at?: string
        }
        Update: {
          cerrada_at?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["estado_semana"]
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          notas?: string | null
          publicada_at?: string | null
          publicada_por?: string | null
          tienda_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "semanas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semanas_publicada_por_fkey"
            columns: ["publicada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semanas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      tiendas: {
        Row: {
          activa: boolean
          ciudad: string | null
          codigo: string
          created_at: string
          hora_apertura: string
          hora_cierre: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          ciudad?: string | null
          codigo: string
          created_at?: string
          hora_apertura?: string
          hora_cierre?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          ciudad?: string | null
          codigo?: string
          created_at?: string
          hora_apertura?: string
          hora_cierre?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      turnos: {
        Row: {
          colaborador_id: string
          created_at: string
          duracion_minutos: number | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          nota: string | null
          orden_bloque: number
          semana_id: string
          semana_inicio: string
          tienda_id: string
          tipo_turno: Database["public"]["Enums"]["tipo_turno"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          duracion_minutos?: number | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          nota?: string | null
          orden_bloque?: number
          semana_id: string
          semana_inicio: string
          tienda_id: string
          tipo_turno?: Database["public"]["Enums"]["tipo_turno"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          duracion_minutos?: number | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          nota?: string | null
          orden_bloque?: number
          semana_id?: string
          semana_inicio?: string
          tienda_id?: string
          tipo_turno?: Database["public"]["Enums"]["tipo_turno"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_tienda_fk"
            columns: ["colaborador_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id"]
          },
          {
            foreignKeyName: "turnos_semana_inicio_fk"
            columns: ["semana_id", "semana_inicio"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id", "fecha_inicio"]
          },
          {
            foreignKeyName: "turnos_semana_inicio_fk"
            columns: ["semana_id", "semana_inicio"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id", "fecha_inicio"]
          },
          {
            foreignKeyName: "turnos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      validaciones: {
        Row: {
          clave: string
          codigo_regla: string
          colaborador_id: string | null
          detalle: Json
          detectada_at: string
          estado: Database["public"]["Enums"]["estado_validacion"]
          id: string
          justificacion: string | null
          mensaje: string
          regla_id: string
          resuelta_at: string | null
          resuelta_por: string | null
          semana_id: string
          severidad: Database["public"]["Enums"]["severidad_regla"]
          tienda_id: string
        }
        Insert: {
          clave?: string
          codigo_regla: string
          colaborador_id?: string | null
          detalle?: Json
          detectada_at?: string
          estado?: Database["public"]["Enums"]["estado_validacion"]
          id?: string
          justificacion?: string | null
          mensaje: string
          regla_id: string
          resuelta_at?: string | null
          resuelta_por?: string | null
          semana_id: string
          severidad: Database["public"]["Enums"]["severidad_regla"]
          tienda_id: string
        }
        Update: {
          clave?: string
          codigo_regla?: string
          colaborador_id?: string | null
          detalle?: Json
          detectada_at?: string
          estado?: Database["public"]["Enums"]["estado_validacion"]
          id?: string
          justificacion?: string | null
          mensaje?: string
          regla_id?: string
          resuelta_at?: string | null
          resuelta_por?: string | null
          semana_id?: string
          severidad?: Database["public"]["Enums"]["severidad_regla"]
          tienda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "validaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "validaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "validaciones_regla_id_fkey"
            columns: ["regla_id"]
            isOneToOne: false
            referencedRelation: "reglas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validaciones_resuelta_por_fkey"
            columns: ["resuelta_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validaciones_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validaciones_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id"]
          },
          {
            foreignKeyName: "validaciones_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ausentismo_mensual: {
        Row: {
          casos: number | null
          causa: Database["public"]["Enums"]["causa_ausencia"] | null
          colaboradores: number | null
          dias: number | null
          mes: string | null
          tienda_id: string | null
          tipo: Database["public"]["Enums"]["tipo_ausencia"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_descansos_dia: {
        Row: {
          cargo_id: string | null
          colaborador_id: string | null
          dow: number | null
          es_fin_semana: boolean | null
          fecha: string | null
          nombre_completo: string | null
          tienda_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semanas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_descansos_mensual: {
        Row: {
          cargo_id: string | null
          colaborador_id: string | null
          descansos_fin_semana: number | null
          dias_descanso: number | null
          domingos: number | null
          fechas: string[] | null
          mes: string | null
          nombre_completo: string | null
          sabados: number | null
          tienda_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semanas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dias_colaborador: {
        Row: {
          bloques: number | null
          colaborador_id: string | null
          fecha: string | null
          minutos: number | null
          primer_inicio: string | null
          semana_id: string | null
          tienda_id: string | null
          tuvo_apertura: boolean | null
          tuvo_cierre: boolean | null
          ultimo_fin: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_tienda_fk"
            columns: ["colaborador_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id"]
          },
          {
            foreignKeyName: "turnos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_extras_reales: {
        Row: {
          anio: number | null
          colaborador_id: string | null
          horas_extra_reales: number | null
          horas_recargo_reales: number | null
          mes: number | null
          reporte_id: string | null
          tienda_id: string | null
          valor_extras: number | null
          valor_recargos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "movimientos_nomina_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_novedades_mensual: {
        Row: {
          casos: number | null
          codigo_empleado: string | null
          colaborador_id: string | null
          dias_ausencia: number | null
          dias_incapacidad: number | null
          dias_licencia: number | null
          dias_permiso: number | null
          dias_total: number | null
          dias_vacaciones: number | null
          mes: string | null
          nombre_completo: string | null
          tienda_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "ausencias_colaborador_tienda_fk"
            columns: ["colaborador_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "ausencias_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_resumen_semanal: {
        Row: {
          aperturas: number | null
          cargo_id: string | null
          cierres: number | null
          colaborador_id: string | null
          dias_descanso: number | null
          dias_trabajados: number | null
          estado: Database["public"]["Enums"]["estado_semana"] | null
          fecha_fin: string | null
          fecha_inicio: string | null
          horas_contrato: number | null
          horas_extra_planeadas: number | null
          horas_planeadas: number | null
          nombre_completo: string | null
          semana_id: string | null
          tienda_id: string | null
          turnos_partidos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semanas_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_turnos_marcados: {
        Row: {
          colaborador_id: string | null
          created_at: string | null
          duracion_minutos: number | null
          es_apertura: boolean | null
          es_cierre: boolean | null
          fecha: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string | null
          nota: string | null
          orden_bloque: number | null
          semana_id: string | null
          semana_inicio: string | null
          tienda_id: string | null
          tipo_turno: Database["public"]["Enums"]["tipo_turno"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_dia"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_descansos_mensual"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["colaborador_id"]
          },
          {
            foreignKeyName: "turnos_colaborador_tienda_fk"
            columns: ["colaborador_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id"]
          },
          {
            foreignKeyName: "turnos_semana_inicio_fk"
            columns: ["semana_id", "semana_inicio"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id", "fecha_inicio"]
          },
          {
            foreignKeyName: "turnos_semana_inicio_fk"
            columns: ["semana_id", "semana_inicio"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id", "fecha_inicio"]
          },
          {
            foreignKeyName: "turnos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "semanas"
            referencedColumns: ["id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_semana_tienda_fk"
            columns: ["semana_id", "tienda_id"]
            isOneToOne: false
            referencedRelation: "v_resumen_semanal"
            referencedColumns: ["semana_id", "tienda_id"]
          },
          {
            foreignKeyName: "turnos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      conciliar_periodo: {
        Args: {
          p_anio: number
          p_mes: number
          p_reporte_id?: string
          p_tienda_id: string
        }
        Returns: {
          anio: number
          estado: Database["public"]["Enums"]["estado_conciliacion"]
          generada_at: string
          generada_por: string | null
          id: string
          mes: number
          reporte_id: string | null
          revisada_at: string | null
          revisada_por: string | null
          tienda_id: string
          tolerancia_horas: number
        }
        SetofOptions: {
          from: "*"
          to: "conciliaciones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      copiar_aforo_semana: {
        Args: {
          p_motivo?: Database["public"]["Enums"]["motivo_cambio"]
          p_semana_destino: string
          p_semana_origen?: string
        }
        Returns: Json
      }
      crear_aforo_copiando_anterior: {
        Args: { p_fecha_inicio: string; p_tienda_id: string }
        Returns: Json
      }
      eliminar_colaborador: { Args: { p_id: string }; Returns: Json }
      generar_alertas_conciliacion: {
        Args: { p_conciliacion_id: string }
        Returns: {
          asunto: string
          canal: Database["public"]["Enums"]["canal_alerta"]
          colaborador_id: string | null
          creada_at: string
          cuerpo: string
          destinatario_perfil_id: string | null
          enviada_at: string | null
          enviada_por: string | null
          estado: Database["public"]["Enums"]["estado_alerta"]
          id: string
          origen_id: string | null
          origen_tabla: string | null
          tienda_id: string
          tipo: Database["public"]["Enums"]["tipo_alerta"]
          variables: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "alertas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      guardar_colaborador: {
        Args: {
          p_cargo_id: string
          p_codigo?: string
          p_documento?: string
          p_fecha_ingreso?: string
          p_horas_contrato?: number
          p_id?: string
          p_nombre: string
          p_tienda_id: string
          p_tipo_jornada?: Database["public"]["Enums"]["tipo_jornada"]
        }
        Returns: {
          activo: boolean
          cargo_id: string
          codigo_empleado: string | null
          created_at: string
          documento: string | null
          fecha_ingreso: string | null
          fecha_retiro: string | null
          horas_contrato: number
          id: string
          nombre_completo: string
          tienda_id: string
          tipo_jornada: Database["public"]["Enums"]["tipo_jornada"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "colaboradores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      guardar_turno_dia: {
        Args: {
          p_ausencia_id?: string
          p_bloques: Json
          p_colaborador_id: string
          p_fecha: string
          p_motivo?: Database["public"]["Enums"]["motivo_cambio"]
          p_semana_id: string
          p_tipo: Database["public"]["Enums"]["tipo_turno"]
        }
        Returns: undefined
      }
      publicar_semana: {
        Args: { p_semana_id: string }
        Returns: {
          cerrada_at: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["estado_semana"]
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          notas: string | null
          publicada_at: string | null
          publicada_por: string | null
          tienda_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "semanas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_ausencia: {
        Args: {
          p_causa?: Database["public"]["Enums"]["causa_ausencia"]
          p_colaborador_id: string
          p_descripcion?: string
          p_fecha_fin: string
          p_fecha_inicio: string
          p_liberar_turnos?: boolean
          p_tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        Returns: {
          causa: Database["public"]["Enums"]["causa_ausencia"] | null
          colaborador_id: string
          created_at: string
          descripcion: string | null
          dias: number | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          registrada_por: string | null
          soporte_url: string | null
          tienda_id: string
          tipo: Database["public"]["Enums"]["tipo_ausencia"]
        }
        SetofOptions: {
          from: "*"
          to: "ausencias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reincorporar_colaborador: {
        Args: { p_id: string }
        Returns: {
          activo: boolean
          cargo_id: string
          codigo_empleado: string | null
          created_at: string
          documento: string | null
          fecha_ingreso: string | null
          fecha_retiro: string | null
          horas_contrato: number
          id: string
          nombre_completo: string
          tienda_id: string
          tipo_jornada: Database["public"]["Enums"]["tipo_jornada"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "colaboradores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resumen_semana: {
        Args: { p_semana_id: string }
        Returns: {
          aperturas: number
          cargo_id: string
          cierres: number
          colaborador_id: string
          dias_descanso: number
          dias_trabajados: number
          horas_contrato: number
          horas_extra_planeadas: number
          horas_planeadas: number
          nombre_completo: string
          turnos_partidos: number
        }[]
      }
      retirar_colaborador: {
        Args: { p_fecha_retiro?: string; p_id: string }
        Returns: Json
      }
      rotacion_fin_semana: {
        Args: { p_mes: string; p_tienda_id: string }
        Returns: {
          cargo: string
          colaborador_id: string
          descansos_fin_semana: number
          detalle: string
          maximo_del_cargo: number
          minimo_del_cargo: number
          nombre_completo: string
          sin_rotar: boolean
        }[]
      }
      turnos_frecuentes: {
        Args: { p_limite?: number; p_tienda_id: string }
        Returns: {
          hora_fin: string
          hora_inicio: string
          minutos: number
          tipo_turno: Database["public"]["Enums"]["tipo_turno"]
          usos: number
        }[]
      }
      validar_semana: {
        Args: { p_semana_id: string }
        Returns: {
          codigo_regla: string
          colaborador_id: string
          mensaje: string
          severidad: Database["public"]["Enums"]["severidad_regla"]
        }[]
      }
    }
    Enums: {
      accion_cambio: "creado" | "editado" | "eliminado"
      app_rol: "coordinador" | "admin_tienda" | "observador"
      canal_alerta: "interna" | "email" | "whatsapp" | "telegram"
      causa_ausencia:
        | "viral"
        | "cita_medica"
        | "accidente_laboral"
        | "accidente_comun"
        | "enfermedad_general"
        | "maternidad_paternidad"
        | "calamidad_domestica"
        | "personal"
        | "otro"
      clasificacion_concepto:
        | "extra_diurna"
        | "extra_nocturna"
        | "extra_dominical_diurna"
        | "extra_dominical_nocturna"
        | "recargo_nocturno"
        | "recargo_dominical"
        | "recargo_festivo"
        | "ordinaria"
        | "otro"
      estado_adjunto: "sin_procesar" | "transcrito" | "descartado"
      estado_alerta: "borrador" | "enviada" | "descartada"
      estado_conciliacion: "pendiente" | "cuadra" | "no_cuadra" | "revisada"
      estado_linea_conciliacion:
        | "cuadra"
        | "exceso"
        | "faltante"
        | "sin_planeacion"
      estado_match: "ok" | "sin_colaborador" | "sin_concepto" | "ambiguo"
      estado_reporte: "cargado" | "procesado" | "conciliado" | "error"
      estado_semana: "borrador" | "publicada" | "cerrada"
      estado_validacion: "abierta" | "resuelta" | "aceptada"
      motivo_cambio:
        | "planeacion_inicial"
        | "incapacidad"
        | "ausencia"
        | "permiso"
        | "vacaciones"
        | "retiro"
        | "cambio_operativo"
        | "solicitud_colaborador"
        | "correccion"
        | "otro"
      origen_adjunto: "foto" | "pdf_sipo" | "otro"
      severidad_regla: "bloqueante" | "advertencia"
      tipo_alerta: "borrador_ajuste" | "llamado_atencion" | "aviso_regla"
      tipo_ausencia:
        | "incapacidad"
        | "permiso_remunerado"
        | "permiso_no_remunerado"
        | "ausencia_injustificada"
        | "vacaciones"
        | "licencia"
      tipo_jornada: "completa" | "medio_tiempo" | "aprendiz" | "temporal"
      tipo_turno: "completo" | "parcial" | "partido" | "fijo_oficios"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      accion_cambio: ["creado", "editado", "eliminado"],
      app_rol: ["coordinador", "admin_tienda", "observador"],
      canal_alerta: ["interna", "email", "whatsapp", "telegram"],
      causa_ausencia: [
        "viral",
        "cita_medica",
        "accidente_laboral",
        "accidente_comun",
        "enfermedad_general",
        "maternidad_paternidad",
        "calamidad_domestica",
        "personal",
        "otro",
      ],
      clasificacion_concepto: [
        "extra_diurna",
        "extra_nocturna",
        "extra_dominical_diurna",
        "extra_dominical_nocturna",
        "recargo_nocturno",
        "recargo_dominical",
        "recargo_festivo",
        "ordinaria",
        "otro",
      ],
      estado_adjunto: ["sin_procesar", "transcrito", "descartado"],
      estado_alerta: ["borrador", "enviada", "descartada"],
      estado_conciliacion: ["pendiente", "cuadra", "no_cuadra", "revisada"],
      estado_linea_conciliacion: [
        "cuadra",
        "exceso",
        "faltante",
        "sin_planeacion",
      ],
      estado_match: ["ok", "sin_colaborador", "sin_concepto", "ambiguo"],
      estado_reporte: ["cargado", "procesado", "conciliado", "error"],
      estado_semana: ["borrador", "publicada", "cerrada"],
      estado_validacion: ["abierta", "resuelta", "aceptada"],
      motivo_cambio: [
        "planeacion_inicial",
        "incapacidad",
        "ausencia",
        "permiso",
        "vacaciones",
        "retiro",
        "cambio_operativo",
        "solicitud_colaborador",
        "correccion",
        "otro",
      ],
      origen_adjunto: ["foto", "pdf_sipo", "otro"],
      severidad_regla: ["bloqueante", "advertencia"],
      tipo_alerta: ["borrador_ajuste", "llamado_atencion", "aviso_regla"],
      tipo_ausencia: [
        "incapacidad",
        "permiso_remunerado",
        "permiso_no_remunerado",
        "ausencia_injustificada",
        "vacaciones",
        "licencia",
      ],
      tipo_jornada: ["completa", "medio_tiempo", "aprendiz", "temporal"],
      tipo_turno: ["completo", "parcial", "partido", "fijo_oficios"],
    },
  },
} as const

