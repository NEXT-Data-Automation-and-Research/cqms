/**
 * Create Audit State
 * State management for creating audits
 */

import type { AuditFormData, Employee, Interaction, Scorecard, ParameterValue } from '../domain/entities.js';

export interface CreateAuditState {
  formData: AuditFormData;
  isSubmitting: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export class CreateAuditStateManager {
  private state: CreateAuditState;

  constructor() {
    this.state = {
      formData: {
        employee: null,
        interaction: null,
        scorecard: null,
        parameters: [],
        transcript: '',
        recommendations: ''
      },
      isSubmitting: false,
      errors: {},
      touched: {}
    };
  }

  getState(): CreateAuditState {
    return { ...this.state };
  }

  setEmployee(employee: Employee | null): void {
    this.state.formData.employee = employee;
    this.state.touched.employee = true;
  }

  setInteraction(interaction: Interaction | null): void {
    this.state.formData.interaction = interaction;
    this.state.touched.interaction = true;
  }

  setScorecard(scorecard: Scorecard | null): void {
    this.state.formData.scorecard = scorecard;
    this.state.formData.parameters = scorecard?.parameters.map(p => ({
      parameterId: p.id,
      value: p.type === 'counter' ? 0 : p.type === 'radio' ? (p.options?.[0] || '') : ''
    })) || [];
    this.state.touched.scorecard = true;
  }

  setParameterValue(parameterId: string, value: number | string, feedback?: string): void {
    const paramIndex = this.state.formData.parameters.findIndex(p => p.parameterId === parameterId);
    if (paramIndex >= 0) {
      this.state.formData.parameters[paramIndex] = { parameterId, value, feedback };
    } else {
      this.state.formData.parameters.push({ parameterId, value, feedback });
    }
  }

  setTranscript(transcript: string): void {
    this.state.formData.transcript = transcript;
    this.state.touched.transcript = true;
  }

  setRecommendations(recommendations: string): void {
    this.state.formData.recommendations = recommendations;
    this.state.touched.recommendations = true;
  }

  setError(field: string, error: string): void {
    this.state.errors[field] = error;
  }

  clearError(field: string): void {
    delete this.state.errors[field];
  }

  setSubmitting(isSubmitting: boolean): void {
    this.state.isSubmitting = isSubmitting;
  }

  reset(): void {
    this.state = {
      formData: {
        employee: null,
        interaction: null,
        scorecard: null,
        parameters: [],
        transcript: '',
        recommendations: ''
      },
      isSubmitting: false,
      errors: {},
      touched: {}
    };
  }
}

