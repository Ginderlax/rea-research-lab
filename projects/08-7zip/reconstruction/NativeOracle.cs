using System;
using System.Runtime.InteropServices;

// Original local test adapter. It calls the released DLL; it is not a reimplementation.
public sealed class NativeOracle : IDisposable
{
    [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr LoadLibrary(string path);
    [DllImport("kernel32", CharSet=CharSet.Ansi)]
    static extern IntPtr GetProcAddress(IntPtr module, string name);
    [DllImport("kernel32")] static extern bool FreeLibrary(IntPtr module);
    [DllImport("oleaut32")] static extern int VariantClear(IntPtr value);
    [DllImport("oleaut32")] static extern uint SysStringByteLen(IntPtr value);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate uint CountDelegate(out uint count);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate uint PropertyDelegate(uint index, uint property, IntPtr value);
    readonly IntPtr library;
    readonly CountDelegate count;
    readonly PropertyDelegate property;
    public NativeOracle(string path) {
        library=LoadLibrary(path); if(library==IntPtr.Zero) throw new Exception("LoadLibrary failed: "+Marshal.GetLastWin32Error());
        count=(CountDelegate)Marshal.GetDelegateForFunctionPointer(GetProcAddress(library,"GetNumberOfFormats"),typeof(CountDelegate));
        property=(PropertyDelegate)Marshal.GetDelegateForFunctionPointer(GetProcAddress(library,"GetHandlerProperty2"),typeof(PropertyDelegate));
    }
    public uint Count() { uint n; uint hr=count(out n);if(hr!=0)throw new Exception("Count HRESULT "+hr);return n; }
    public PropertyResult Read(uint index,uint id) {
        IntPtr v=Marshal.AllocHGlobal(24);
        for(int k=0;k<24;k++)Marshal.WriteByte(v,k,0);
        try {
            uint hr=property(index,id,v);ushort vt=(ushort)Marshal.ReadInt16(v);
            string value=null;
            if(vt==8) {
                IntPtr ptr=Marshal.ReadIntPtr(v,8); int n=checked((int)SysStringByteLen(ptr));byte[] bytes=new byte[n];Marshal.Copy(ptr,bytes,0,n);
                value=(id==0||id==2||id==3)?System.Text.Encoding.Unicode.GetString(bytes):BitConverter.ToString(bytes).Replace("-","").ToLowerInvariant();
            } else if(vt==19)value=((uint)Marshal.ReadInt32(v,8)).ToString(System.Globalization.CultureInfo.InvariantCulture);
            else if(vt==11)value=(Marshal.ReadInt16(v,8)!=0)?"true":"false";
            else if(vt!=0)value="unhandled-vt-"+vt;
            return new PropertyResult {index=index,property=id,hresult=hr,variant_type=vt,value=value};
        } finally {VariantClear(v);Marshal.FreeHGlobal(v);}
    }
    public void Dispose(){FreeLibrary(library);}
}
public sealed class PropertyResult {public uint index;public uint property;public uint hresult;public ushort variant_type;public string value;}
