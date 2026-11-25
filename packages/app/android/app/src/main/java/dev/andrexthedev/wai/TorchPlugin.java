package dev.andrexthedev.wai;

import android.content.Context;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Minimal torch plugin for the "darkness & emergency" mode.
 *
 * Uses CameraManager.setTorchMode (API 23+) on the rear camera with a flash unit.
 * No camera permission is required for torch-only control since Android M, but we
 * still declare it so behaviour stays consistent on OEM builds that enforce it.
 */
@CapacitorPlugin(
    name = "Torch",
    permissions = { @Permission(alias = "camera", strings = { android.Manifest.permission.CAMERA }) }
)
public class TorchPlugin extends Plugin {

    private String cameraIdWithFlash;

    private String findCameraWithFlash(Context context) throws CameraAccessException {
        if (cameraIdWithFlash != null) return cameraIdWithFlash;
        CameraManager manager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        if (manager == null) return null;
        for (String id : manager.getCameraIdList()) {
            CameraCharacteristics characteristics = manager.getCameraCharacteristics(id);
            Boolean hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
            Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
            if (Boolean.TRUE.equals(hasFlash) && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                cameraIdWithFlash = id;
                return id;
            }
        }
        return null;
    }

    @PluginMethod
    public void setTorch(PluginCall call) {
        Boolean on = call.getBoolean("on", false);
        applyTorch(call, Boolean.TRUE.equals(on));
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("available", findCameraWithFlash(getContext()) != null);
            call.resolve(result);
        } catch (CameraAccessException error) {
            call.reject("camera-unavailable", error);
        }
    }

    private void applyTorch(PluginCall call, boolean on) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            call.reject("not-supported");
            return;
        }
        try {
            String id = findCameraWithFlash(getContext());
            if (id == null) {
                call.reject("no-flash-unit");
                return;
            }
            CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            if (manager == null) {
                call.reject("no-camera-service");
                return;
            }
            manager.setTorchMode(id, on);
            JSObject result = new JSObject();
            result.put("on", on);
            call.resolve(result);
        } catch (CameraAccessException error) {
            call.reject("camera-access", error);
        }
    }
}
