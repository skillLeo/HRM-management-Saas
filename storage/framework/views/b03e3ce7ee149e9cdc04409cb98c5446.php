<?php $__env->startSection('template_title'); ?>
    <?php echo e(trans('installer_messages.environment.wizard.templateTitle')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('title'); ?>
    <i class="fas fa-magic mr-2"></i>
    <?php echo trans('installer_messages.environment.wizard.title'); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('container'); ?>
    <form method="post" action="<?php echo e(route('LaravelInstaller::environmentSaveWizard')); ?>" class="space-y-8">
        <?php echo csrf_field(); ?>
        
        <!-- Environment Section -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i class="fas fa-cog mr-2 text-green-600"></i>
                <?php echo e(trans('installer_messages.environment.wizard.tabs.environment')); ?>

            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label for="app_name" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.app_name_label')); ?>

                    </label>
                    <input type="text" name="app_name" id="app_name" value="" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.app_name_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 <?php echo e($errors->has('app_name') ? 'border-red-500' : ''); ?>" />
                    <?php if($errors->has('app_name')): ?>
                        <p class="text-red-600 text-sm flex items-center mt-1">
                            <i class="fas fa-exclamation-triangle mr-1"></i>
                            <?php echo e($errors->first('app_name')); ?>

                        </p>
                    <?php endif; ?>
                </div>

                <div class="space-y-2">
                    <label for="environment" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.app_environment_label')); ?>

                    </label>
                    <select name="environment" id="environment" onchange="checkEnvironment(this.value);"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="local" selected><?php echo e(trans('installer_messages.environment.wizard.form.app_environment_label_local')); ?></option>
                        <option value="development"><?php echo e(trans('installer_messages.environment.wizard.form.app_environment_label_developement')); ?></option>
                        <option value="production"><?php echo e(trans('installer_messages.environment.wizard.form.app_environment_label_production')); ?></option>
                        <option value="other"><?php echo e(trans('installer_messages.environment.wizard.form.app_environment_label_other')); ?></option>
                    </select>
                    <div id="environment_text_input" style="display: none;" class="mt-2">
                        <input type="text" name="environment_custom" id="environment_custom" 
                               placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.app_environment_placeholder_other')); ?>"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.app_debug_label')); ?>

                    </label>
                    <div class="flex space-x-4">
                        <label class="flex items-center">
                            <input type="radio" name="app_debug" value="true" class="mr-2 text-green-600" />
                            <?php echo e(trans('installer_messages.environment.wizard.form.app_debug_label_true')); ?>

                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="app_debug" value="false" class="mr-2 text-green-600" checked />
                            <?php echo e(trans('installer_messages.environment.wizard.form.app_debug_label_false')); ?>

                        </label>
                    </div>
                </div>

                <div class="space-y-2">
                    <label for="app_url" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.app_url_label')); ?>

                    </label>
                    <input type="url" name="app_url" id="app_url" value="http://localhost" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.app_url_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
            </div>
        </div>

        <!-- Database Section -->
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i class="fas fa-database mr-2 text-green-600"></i>
                <?php echo e(trans('installer_messages.environment.wizard.tabs.database')); ?>

            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label for="database_connection" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.db_connection_label')); ?>

                    </label>
                    <select name="database_connection" id="database_connection"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="mysql" selected><?php echo e(trans('installer_messages.environment.wizard.form.db_connection_label_mysql')); ?></option>
                        <option value="sqlite"><?php echo e(trans('installer_messages.environment.wizard.form.db_connection_label_sqlite')); ?></option>
                        <option value="pgsql"><?php echo e(trans('installer_messages.environment.wizard.form.db_connection_label_pgsql')); ?></option>
                    </select>
                </div>

                <div class="space-y-2">
                    <label for="database_hostname" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.db_host_label')); ?>

                    </label>
                    <input type="text" name="database_hostname" id="database_hostname" value="127.0.0.1" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.db_host_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div class="space-y-2">
                    <label for="database_port" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.db_port_label')); ?>

                    </label>
                    <input type="number" name="database_port" id="database_port" value="3306" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.db_port_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div class="space-y-2">
                    <label for="database_name" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.db_name_label')); ?>

                    </label>
                    <input type="text" name="database_name" id="database_name" value="" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.db_name_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div class="space-y-2">
                    <label for="database_username" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.db_username_label')); ?>

                    </label>
                    <input type="text" name="database_username" id="database_username" value="" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.db_username_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div class="space-y-2">
                    <label for="database_password" class="block text-sm font-medium text-gray-700">
                        <?php echo e(trans('installer_messages.environment.wizard.form.db_password_label')); ?>

                    </label>
                    <input type="password" name="database_password" id="database_password" value="" 
                           placeholder="<?php echo e(trans('installer_messages.environment.wizard.form.db_password_placeholder')); ?>"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
            </div>
        </div>

        <!-- Hidden fields for other settings with default values -->
        <input type="hidden" name="app_log_level" value="debug">
        <input type="hidden" name="broadcast_driver" value="log">
        <input type="hidden" name="cache_driver" value="file">
        <input type="hidden" name="session_driver" value="file">
        <input type="hidden" name="queue_driver" value="sync">
        <input type="hidden" name="redis_hostname" value="127.0.0.1">
        <input type="hidden" name="redis_password" value="null">
        <input type="hidden" name="redis_port" value="6379">
        <input type="hidden" name="mail_driver" value="smtp">
        <input type="hidden" name="mail_host" value="smtp.mailtrap.io">
        <input type="hidden" name="mail_port" value="2525">
        <input type="hidden" name="mail_username" value="null">
        <input type="hidden" name="mail_password" value="null">
        <input type="hidden" name="mail_encryption" value="null">
        <input type="hidden" name="pusher_app_id" value="">
        <input type="hidden" name="pusher_app_key" value="">
        <input type="hidden" name="pusher_app_secret" value="">
        
        <div class="text-center">
            <button type="submit" class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                <i class="fas fa-rocket mr-2"></i>
                <?php echo e(trans('installer_messages.environment.wizard.form.buttons.install')); ?>

            </button>
        </div>
    </form>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('scripts'); ?>
    <script>
        function checkEnvironment(val) {
            const element = document.getElementById('environment_text_input');
            element.style.display = val === 'other' ? 'block' : 'none';
        }
    </script>
<?php $__env->stopSection(); ?>
<?php echo $__env->make('vendor.installer.layouts.master', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Applications/XAMPP/htdocs/HRM-management-Saas/resources/views/vendor/installer/environment-wizard.blade.php ENDPATH**/ ?>