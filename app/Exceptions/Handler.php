<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        $this->renderable(function (UnauthorizedException $e, $request) {
            if ($request->expectsJson() || $request->inertia()) {
                return response()->json(['message' => __('Permission Denied.')], 403);
            }
            return redirect()->back()->with('error', __('Permission Denied.'));
        });
    }
}
