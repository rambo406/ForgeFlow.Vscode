import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AzureDevOpsConfigComponent, AzureDevOpsConfig, ConnectionTestResult } from './azure-devops-config.component';
import { MessageService } from '../../../core/services/message.service';
import { AppCardComponent, AppInputComponent, AppButtonComponent, AppAlertComponent } from '@shared/components';

describe('AzureDevOpsConfigComponent', () => {
  let component: AzureDevOpsConfigComponent;
  let fixture: ComponentFixture<AzureDevOpsConfigComponent>;
  let messageService: jasmine.SpyObj<MessageService>;

  const mockConfiguration: AzureDevOpsConfig = {
    organizationUrl: 'https://dev.azure.com/test-org',
    personalAccessToken: 'mock-pat-token-that-is-52-characters-long-and-valid',
    defaultProject: 'TestProject'
  };

  beforeEach(async () => {
    const messageServiceSpy = jasmine.createSpyObj('MessageService', [
      'testConnection',
      'validateSetting'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        AzureDevOpsConfigComponent,
        AppCardComponent,
        AppInputComponent,
        AppButtonComponent,
        AppAlertComponent
      ],
      providers: [
        FormBuilder,
        { provide: MessageService, useValue: messageServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AzureDevOpsConfigComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
  });

  beforeEach(() => {
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.configForm).toBeDefined();
      expect(component.configForm.get('organizationUrl')?.value).toBe('');
      expect(component.configForm.get('personalAccessToken')?.value).toBe('');
      expect(component.configForm.get('defaultProject')?.value).toBe('');
      expect(component.configForm.get('connectionTimeout')?.value).toBe(30);
      expect(component.configForm.get('retryAttempts')?.value).toBe(3);
      expect(component.configForm.get('apiVersion')?.value).toBe('7.1-preview.1');
    });

    it('should patch form values when configuration input is provided', () => {
      component.configuration = mockConfiguration;
      component.ngOnInit();
      
      expect(component.configForm.get('organizationUrl')?.value).toBe(mockConfiguration.organizationUrl);
      expect(component.configForm.get('personalAccessToken')?.value).toBe(mockConfiguration.personalAccessToken);
      expect(component.configForm.get('defaultProject')?.value).toBe(mockConfiguration.defaultProject);
    });
  });

  describe('Form Validation', () => {
    it('should validate organization URL format', () => {
      const orgUrlControl = component.configForm.get('organizationUrl');
      
      // Test invalid URLs
      orgUrlControl?.setValue('invalid-url');
      expect(orgUrlControl?.valid).toBeFalsy();
      
      orgUrlControl?.setValue('http://dev.azure.com/test');
      expect(orgUrlControl?.valid).toBeFalsy();
      
      orgUrlControl?.setValue('https://invalid-domain.com/test');
      expect(orgUrlControl?.valid).toBeFalsy();
      
      // Test valid URLs
      orgUrlControl?.setValue('https://dev.azure.com/test-org');
      expect(orgUrlControl?.valid).toBeTruthy();
      
      orgUrlControl?.setValue('https://test-org.visualstudio.com');
      expect(orgUrlControl?.valid).toBeTruthy();
    });

    it('should validate PAT token minimum length', () => {
      const patControl = component.configForm.get('personalAccessToken');
      
      // Test short token
      patControl?.setValue('short-token');
      expect(patControl?.valid).toBeFalsy();
      
      // Test valid length token
      patControl?.setValue('valid-pat-token-that-is-exactly-52-characters-long');
      expect(patControl?.valid).toBeTruthy();
    });

    it('should validate connection timeout range', () => {
      const timeoutControl = component.configForm.get('connectionTimeout');
      
      // Test below minimum
      timeoutControl?.setValue(4);
      expect(timeoutControl?.valid).toBeFalsy();
      
      // Test above maximum
      timeoutControl?.setValue(121);
      expect(timeoutControl?.valid).toBeFalsy();
      
      // Test valid range
      timeoutControl?.setValue(30);
      expect(timeoutControl?.valid).toBeTruthy();
    });

    it('should validate retry attempts range', () => {
      const retryControl = component.configForm.get('retryAttempts');
      
      // Test below minimum
      retryControl?.setValue(-1);
      expect(retryControl?.valid).toBeFalsy();
      
      // Test above maximum
      retryControl?.setValue(11);
      expect(retryControl?.valid).toBeFalsy();
      
      // Test valid range
      retryControl?.setValue(3);
      expect(retryControl?.valid).toBeTruthy();
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      component.configForm.patchValue({
        organizationUrl: 'https://dev.azure.com/test-org',
        personalAccessToken: 'valid-pat-token-that-is-exactly-52-characters-long'
      });
    });

    it('should test connection successfully', async () => {
      const mockResult: ConnectionTestResult = {
        success: true,
        message: 'Connection successful',
        details: {
          organization: 'test-org',
          projects: ['Project1', 'Project2'],
          permissions: ['Code (read)', 'Pull Request (read/write)']
        }
      };

      messageService.testConnection.and.returnValue(Promise.resolve(mockResult));

      await component.testConnection();

      expect(messageService.testConnection).toHaveBeenCalled();
      expect(component.connectionStatus()).toEqual(mockResult);
      expect(component.availableProjects()).toEqual(['Project1', 'Project2']);
      expect(component.testingConnection()).toBeFalsy();
    });

    it('should handle connection test failure', async () => {
      const mockResult: ConnectionTestResult = {
        success: false,
        message: 'Authentication failed'
      };

      messageService.testConnection.and.returnValue(Promise.resolve(mockResult));

      await component.testConnection();

      expect(component.connectionStatus()).toEqual(mockResult);
      expect(component.validationStatus()?.type).toBe('error');
      expect(component.testingConnection()).toBeFalsy();
    });

    it('should handle connection test error', async () => {
      messageService.testConnection.and.returnValue(Promise.reject(new Error('Network error')));

      await component.testConnection();

      expect(component.connectionStatus()?.success).toBeFalsy();
      expect(component.connectionStatus()?.message).toContain('Network error');
      expect(component.testingConnection()).toBeFalsy();
    });

    it('should not test connection when form is invalid', async () => {
      component.configForm.patchValue({
        organizationUrl: 'invalid-url',
        personalAccessToken: 'short'
      });

      await component.testConnection();

      expect(messageService.testConnection).not.toHaveBeenCalled();
      expect(component.validationStatus()?.type).toBe('error');
    });
  });

  describe('Configuration Management', () => {
    it('should emit save event when form is valid', () => {
      spyOn(component.save, 'emit');
      
      component.configForm.patchValue(mockConfiguration);
      component.onSave();

      expect(component.save.emit).toHaveBeenCalledWith(jasmine.objectContaining(mockConfiguration));
    });

    it('should not emit save event when form is invalid', () => {
      spyOn(component.save, 'emit');
      
      component.configForm.patchValue({
        organizationUrl: 'invalid-url',
        personalAccessToken: 'short'
      });
      component.onSave();

      expect(component.save.emit).not.toHaveBeenCalled();
      expect(component.validationStatus()?.type).toBe('error');
    });

    it('should clear configuration', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      component.configForm.patchValue(mockConfiguration);
      component.clearConfiguration();

      expect(component.configForm.get('organizationUrl')?.value).toBe('');
      expect(component.configForm.get('personalAccessToken')?.value).toBe('');
      expect(component.configForm.get('defaultProject')?.value).toBe('');
      expect(component.connectionStatus()).toBeNull();
      expect(component.availableProjects()).toEqual([]);
    });

    it('should not clear configuration when user cancels', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      component.configForm.patchValue(mockConfiguration);
      const originalUrl = component.configForm.get('organizationUrl')?.value;
      
      component.clearConfiguration();

      expect(component.configForm.get('organizationUrl')?.value).toBe(originalUrl);
    });
  });

  describe('Project Selection', () => {
    it('should select project from available projects', () => {
      component.availableProjects.set(['Project1', 'Project2', 'Project3']);
      
      component.selectProject('Project2');

      expect(component.configForm.get('defaultProject')?.value).toBe('Project2');
    });

    it('should emit configuration change when project is selected', () => {
      spyOn(component.configurationChange, 'emit');
      component.configForm.patchValue(mockConfiguration);
      
      component.selectProject('NewProject');

      expect(component.configurationChange.emit).toHaveBeenCalled();
    });
  });

  describe('Validation Configuration', () => {
    it('should validate configuration successfully', async () => {
      component.configForm.patchValue({
        organizationUrl: 'https://dev.azure.com/test-org',
        personalAccessToken: 'valid-pat-token-that-is-exactly-52-characters-long',
        connectionTimeout: 30,
        retryAttempts: 3
      });

      await component.validateConfiguration();

      expect(component.validationStatus()?.type).toBe('success');
      expect(component.validatingConfig()).toBeFalsy();
    });

    it('should fail validation for invalid URL', async () => {
      component.configForm.patchValue({
        organizationUrl: 'invalid-url',
        personalAccessToken: 'valid-pat-token-that-is-exactly-52-characters-long'
      });

      await component.validateConfiguration();

      expect(component.validationStatus()?.type).toBe('error');
      expect(component.validationStatus()?.message).toContain('Invalid Azure DevOps organization URL format');
    });

    it('should fail validation for short PAT token', async () => {
      component.configForm.patchValue({
        organizationUrl: 'https://dev.azure.com/test-org',
        personalAccessToken: 'short-token'
      });

      await component.validateConfiguration();

      expect(component.validationStatus()?.type).toBe('error');
      expect(component.validationStatus()?.message).toContain('Personal Access Token appears to be too short');
    });
  });

  describe('Field Error Messages', () => {
    it('should return required error message', () => {
      const orgUrlControl = component.configForm.get('organizationUrl');
      orgUrlControl?.markAsTouched();
      orgUrlControl?.setValue('');

      const errorMessage = component.getFieldError('organizationUrl');

      expect(errorMessage).toBe('Organization URL is required');
    });

    it('should return invalid URL error message', () => {
      const orgUrlControl = component.configForm.get('organizationUrl');
      orgUrlControl?.markAsTouched();
      orgUrlControl?.setValue('invalid-url');

      const errorMessage = component.getFieldError('organizationUrl');

      expect(errorMessage).toBe('Invalid URL format');
    });

    it('should return minimum length error message', () => {
      const patControl = component.configForm.get('personalAccessToken');
      patControl?.markAsTouched();
      patControl?.setValue('short');

      const errorMessage = component.getFieldError('personalAccessToken');

      expect(errorMessage).toBe('Personal Access Token must be at least 52 characters');
    });

    it('should return empty string for valid field', () => {
      const orgUrlControl = component.configForm.get('organizationUrl');
      orgUrlControl?.markAsTouched();
      orgUrlControl?.setValue('https://dev.azure.com/test-org');

      const errorMessage = component.getFieldError('organizationUrl');

      expect(errorMessage).toBe('');
    });
  });

  describe('Real-time Validation', () => {
    it('should show success message for valid organization URL', (done) => {
      component.configForm.get('organizationUrl')?.setValue('https://dev.azure.com/test-org');

      setTimeout(() => {
        expect(component.validationStatus()?.type).toBe('success');
        expect(component.validationStatus()?.message).toContain('Organization URL format is valid');
        done();
      }, 600); // Wait for debounce
    });

    it('should show error message for invalid organization URL', (done) => {
      component.configForm.get('organizationUrl')?.setValue('invalid-url');

      setTimeout(() => {
        expect(component.validationStatus()?.type).toBe('error');
        expect(component.validationStatus()?.message).toContain('Invalid Azure DevOps organization URL format');
        done();
      }, 600); // Wait for debounce
    });

    it('should show success message for valid PAT token', (done) => {
      component.configForm.get('personalAccessToken')?.setValue('valid-pat-token-that-is-exactly-52-characters-long');

      setTimeout(() => {
        expect(component.validationStatus()?.type).toBe('success');
        expect(component.validationStatus()?.message).toContain('PAT token format appears valid');
        done();
      }, 600); // Wait for debounce
    });

    it('should show error message for short PAT token', (done) => {
      component.configForm.get('personalAccessToken')?.setValue('short-token');

      setTimeout(() => {
        expect(component.validationStatus()?.type).toBe('error');
        expect(component.validationStatus()?.message).toContain('PAT token appears to be too short');
        done();
      }, 600); // Wait for debounce
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize properly on ngOnInit', () => {
      spyOn(console, 'log');
      
      component.ngOnInit();

      expect(console.log).toHaveBeenCalledWith('Azure DevOps Config component initialized');
    });

    it('should clean up on ngOnDestroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});