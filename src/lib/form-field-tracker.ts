import { FormField, FormFieldData } from '@/types/pdf-editor';

export class FormFieldTracker {
  private formFields: FormField[] = [];
  private formData: FormFieldData = {};
  private observers: MutationObserver[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startTracking();
  }

  private startTracking() {
    // Start periodic scanning for form fields
    this.intervalId = setInterval(() => {
      this.scanForFormFields();
    }, 1000);

    // Also scan immediately
    setTimeout(() => this.scanForFormFields(), 500);
  }

  // Make scanForFormFields public
  public scanForFormFields() {
    const pdfContainer = document.querySelector('.react-pdf__Document');
    if (!pdfContainer) return;

    // Find all PDF form elements
    const formElements = pdfContainer.querySelectorAll(
      'input, textarea, select, button, ' +
      '.textWidgetAnnotation input, ' +
      '.choiceWidgetAnnotation select, ' +
      '.choiceWidgetAnnotation input, ' +
      '.buttonWidgetAnnotation button, ' +
      '.checkboxWidgetAnnotation input'
    );

    formElements.forEach((element, index) => {
      this.trackFormElement(element as HTMLElement, index);
    });
  }

  private trackFormElement(element: HTMLElement, index: number) {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Get element position and dimensions
    const rect = element.getBoundingClientRect();
    const pdfPage = element.closest('.react-pdf__Page');
    if (!pdfPage) return;

    const pageRect = pdfPage.getBoundingClientRect();
    const pageNumber = this.getPageNumber(pdfPage);

    // Calculate relative position within the PDF page
    const relativeX = rect.left - pageRect.left;
    const relativeY = rect.top - pageRect.top;

    // Determine field type
    let fieldType: FormField['type'] = 'text';
    let fieldValue: string | boolean = '';

    if (input.type) {
      switch (input.type.toLowerCase()) {
        case 'checkbox':
          fieldType = 'checkbox';
          fieldValue = (input as HTMLInputElement).checked;
          break;
        case 'radio':
          fieldType = 'radio';
          fieldValue = (input as HTMLInputElement).checked;
          break;
        case 'textarea':
          fieldType = 'textarea';
          fieldValue = input.value || '';
          break;
        default:
          fieldType = 'text';
          fieldValue = input.value || '';
      }
    } else if (element.tagName.toLowerCase() === 'select') {
      fieldType = 'select';
      fieldValue = (input as HTMLSelectElement).value || '';
    } else if (element.tagName.toLowerCase() === 'textarea') {
      fieldType = 'textarea';
      fieldValue = input.value || '';
    } else if (element.tagName.toLowerCase() === 'button') {
      fieldType = 'button';
      fieldValue = element.textContent || '';
    }

    // Get field name (try multiple attributes)
    const fieldName = input.name || 
                     input.id || 
                     element.getAttribute('data-field-name') ||
                     element.getAttribute('title') ||
                     `field_${pageNumber}_${index}`;

    const fieldId = `form_field_${pageNumber}_${index}`;

    // Check if this field already exists
    const existingFieldIndex = this.formFields.findIndex(f => f.id === fieldId);

    const formField: FormField = {
      id: fieldId,
      name: fieldName,
      type: fieldType,
      value: fieldValue,
      x: relativeX,
      y: relativeY,
      width: rect.width,
      height: rect.height,
      pageNumber,
      fieldName,
      options: fieldType === 'select' ? this.getSelectOptions(element as HTMLSelectElement) : undefined
    };

    if (existingFieldIndex >= 0) {
      // Update existing field
      this.formFields[existingFieldIndex] = formField;
    } else {
      // Add new field
      this.formFields.push(formField);
    }

    // Update form data
    this.formData[fieldName] = fieldValue;

    // Add event listeners to track changes
    this.addFieldEventListeners(element, fieldName);
  }

  private getPageNumber(pageElement: Element): number {
    const pageAttr = pageElement.getAttribute('data-page-number');
    if (pageAttr) return parseInt(pageAttr, 10);

    // Fallback: find page number from parent structure
    const allPages = document.querySelectorAll('.react-pdf__Page');
    const pageIndex = Array.from(allPages).indexOf(pageElement as Element);
    return pageIndex + 1;
  }

  private getSelectOptions(selectElement: HTMLSelectElement): string[] {
    const options: string[] = [];
    for (let i = 0; i < selectElement.options.length; i++) {
      options.push(selectElement.options[i].value || selectElement.options[i].text);
    }
    return options;
  }

  private addFieldEventListeners(element: HTMLElement, fieldName: string) {
    // Remove existing listeners to avoid duplicates
    const existingListener = (element as any)._formFieldListener;
    if (existingListener) {
      element.removeEventListener('input', existingListener);
      element.removeEventListener('change', existingListener);
    }

    // Create new listener
    const listener = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      let value: string | boolean = '';

      if (target.type === 'checkbox' || target.type === 'radio') {
        value = (target as HTMLInputElement).checked;
      } else {
        value = target.value || '';
      }

      this.formData[fieldName] = value;

      // Update the corresponding form field
      const fieldIndex = this.formFields.findIndex(f => f.fieldName === fieldName);
      if (fieldIndex >= 0) {
        this.formFields[fieldIndex].value = value;
      }

      // Dispatch custom event for external listeners
      window.dispatchEvent(new CustomEvent('pdfFormFieldChanged', {
        detail: { fieldName, value, formData: this.formData }
      }));
    };

    // Store listener reference for cleanup
    (element as any)._formFieldListener = listener;

    // Add listeners
    element.addEventListener('input', listener);
    element.addEventListener('change', listener);
  }

  public getFormFields(): FormField[] {
    return [...this.formFields];
  }

  public getFormData(): FormFieldData {
    return { ...this.formData };
  }

  public updateFormData(fieldName: string, value: string | boolean) {
    this.formData[fieldName] = value;
    
    // Update the corresponding form field
    const fieldIndex = this.formFields.findIndex(f => f.fieldName === fieldName);
    if (fieldIndex >= 0) {
      this.formFields[fieldIndex].value = value;
    }

    // Update the actual DOM element if it exists
    const element = document.querySelector(`[name="${fieldName}"], [id="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (element) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        (element as HTMLInputElement).checked = value as boolean;
      } else {
        element.value = value as string;
      }
    }
  }

  public destroy() {
    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Remove event listeners
    this.formFields.forEach(field => {
      const element = document.querySelector(`[name="${field.fieldName}"], [id="${field.fieldName}"]`);
      if (element && (element as any)._formFieldListener) {
        element.removeEventListener('input', (element as any)._formFieldListener);
        element.removeEventListener('change', (element as any)._formFieldListener);
        delete (element as any)._formFieldListener;
      }
    });

    // Clear data
    this.formFields = [];
    this.formData = {};
  }
}

// Singleton instance
let formFieldTracker: FormFieldTracker | null = null;

export const getFormFieldTracker = (): FormFieldTracker => {
  if (!formFieldTracker) {
    formFieldTracker = new FormFieldTracker();
  }
  return formFieldTracker;
};

export const destroyFormFieldTracker = () => {
  if (formFieldTracker) {
    formFieldTracker.destroy();
    formFieldTracker = null;
  }
};
