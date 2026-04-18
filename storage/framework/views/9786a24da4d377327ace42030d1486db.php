<?php $__env->startSection('template_title'); ?>
    <?php echo e(trans('installer_messages.final.templateTitle')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('title'); ?>
    <i class="fas fa-check-circle mr-2 text-green-600"></i>
    <?php echo e(trans('installer_messages.final.title')); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('container'); ?>
    <div class="text-center mb-8">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-check text-3xl text-green-600"></i>
        </div>
        <h2 class="text-2xl font-semibold text-gray-900 mb-2">Installation Completed Successfully!</h2>
        <p class="text-gray-600">Your application has been installed and is ready to use.</p>
    </div>

    <!-- Default User Credentials -->
    <div class="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
        <h3 class="font-medium text-green-900 mb-4 flex items-center">
            <i class="fas fa-users mr-2"></i>
            Default User Credentials
        </h3>
        <?php if(isSaas()): ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-medium text-gray-900 mb-2">Super Admin</h4>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Email:</span>
                            <code class="bg-gray-100 px-2 py-1 rounded text-xs">superadmin@example.com</code>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Password:</span>
                            <code class="bg-gray-100 px-2 py-1 rounded text-xs">password</code>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-medium text-gray-900 mb-2">Company User</h4>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Email:</span>
                            <code class="bg-gray-100 px-2 py-1 rounded text-xs">company@example.com</code>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Password:</span>
                            <code class="bg-gray-100 px-2 py-1 rounded text-xs">password</code>
                        </div>
                    </div>
                </div>
            </div>
        <?php else: ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded border">
                    <h4 class="font-medium text-gray-900 mb-2">Company User</h4>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Email:</span>
                            <code class="bg-gray-100 px-2 py-1 rounded text-xs">company@example.com</code>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Password:</span>
                            <code class="bg-gray-100 px-2 py-1 rounded text-xs">password</code>
                        </div>
                    </div>
                </div>
            </div>
        <?php endif; ?>
        <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div class="flex items-center text-yellow-800 text-sm">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span>Please change these default passwords after logging in for security.</span>
            </div>
        </div>
    </div>

    <div class="space-y-6 p-6 mt-6">
        <?php if(session('message')['dbOutputLog']): ?>
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-medium text-gray-900 mb-2 flex items-center">
                    <i class="fas fa-database mr-2 text-green-600"></i>
                    <?php echo e(trans('installer_messages.final.migration')); ?>

                </h3>
                <pre class="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto"><code><?php echo e(session('message')['dbOutputLog']); ?></code></pre>
            </div>
        <?php endif; ?>

        <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-medium text-gray-900 mb-2 flex items-center">
                <i class="fas fa-terminal mr-2 text-green-600"></i>
                <?php echo e(trans('installer_messages.final.console')); ?>

            </h3>
            <pre class="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto"><code><?php echo e($finalMessages); ?></code></pre>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-medium text-gray-900 mb-2 flex items-center">
                <i class="fas fa-info-circle mr-2 text-green-600"></i>
                <?php echo e(trans('installer_messages.final.log')); ?>

            </h3>
            <pre class="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto"><code><?php echo e($finalStatusMessage); ?></code></pre>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-medium text-gray-900 mb-2 flex items-center">
                <i class="fas fa-file-alt mr-2 text-green-600"></i>
                <?php echo e(trans('installer_messages.final.env')); ?>

            </h3>
            <pre class="bg-gray-800 text-gray-300 p-4 rounded text-sm overflow-x-auto"><code><?php echo e($finalEnvFile); ?></code></pre>
        </div>
    </div>

    <div class="text-center mt-8">
        <a href="<?php echo e(url('/dashboard')); ?>"
            class="inline-flex items-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200">
            <i class="fas fa-sign-in-alt mr-2"></i>
            Go to Dashboard
        </a>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('vendor.installer.layouts.master', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Applications/XAMPP/htdocs/HRM-management-Saas/resources/views/vendor/installer/finished.blade.php ENDPATH**/ ?>