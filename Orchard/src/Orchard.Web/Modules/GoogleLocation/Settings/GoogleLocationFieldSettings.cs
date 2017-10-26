namespace GoogleLocation.Settings
{
    public enum GoogleLocationFieldDisplayOptions
    {
        NameOnly,
        NameAndLinkToMap,
        NameAndEmbeddedMap
    }
    public class GoogleLocationFieldSettings
    {
        public GoogleLocationFieldDisplayOptions DisplayOptions { get; set; }
    }
}