"""Resize an X11 top-level window by id, through libX11 (no window manager runs on the headless display).

    DISPLAY=:96 python3 x11-resize.py <window id, e.g. 0x20002c> <width> <height>
"""
import ctypes
import sys

x11 = ctypes.cdll.LoadLibrary("libX11.so.6")
x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
x11.XMoveResizeWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_int, ctypes.c_uint, ctypes.c_uint]
x11.XSync.argtypes = [ctypes.c_void_p, ctypes.c_int]
x11.XCloseDisplay.argtypes = [ctypes.c_void_p]

win, width, height = int(sys.argv[1], 16), int(sys.argv[2]), int(sys.argv[3])
dpy = x11.XOpenDisplay(None)
if not dpy:
    sys.exit("x11-resize: cannot open the display")
x11.XMoveResizeWindow(dpy, win, 0, 0, width, height)
x11.XSync(dpy, 0)
x11.XCloseDisplay(dpy)
