namespace LocationPickerField.Settings
{
    public enum LocationPickerFieldDisplayOptions
    {
        LocationAsString,
        LocationDouble,
        LocationAsStringAndDouble
    }
    public class LocationPickerFieldSettings
    {
        public LocationPickerFieldDisplayOptions SaveOptions { get; set; }
    }
}