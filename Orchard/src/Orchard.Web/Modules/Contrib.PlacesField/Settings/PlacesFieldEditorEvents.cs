using System.Collections.Generic;
using Contrib.PlacesField.Settings;
using Orchard.ContentManagement;
using Orchard.ContentManagement.MetaData;
using Orchard.ContentManagement.MetaData.Builders;
using Orchard.ContentManagement.MetaData.Models;
using Orchard.ContentManagement.ViewModels;

public class PlacesFieldEditorEvents : ContentDefinitionEditorEventsBase
{

	public override IEnumerable<TemplateViewModel>
	  PartFieldEditor(ContentPartFieldDefinition definition)
	{
		if (definition.FieldDefinition.Name == "PlacesField")
		{
			var model = definition.Settings.GetModel<PlacesFieldSettings>();
			yield return DefinitionTemplate(model);
		}
	}

	public override IEnumerable<TemplateViewModel> PartFieldEditorUpdate(
	  ContentPartFieldDefinitionBuilder builder, IUpdateModel updateModel)
	{
		var model = new PlacesFieldSettings();
		if (builder.FieldType != "PlacesField")
		{
			yield break;
		}

		if (updateModel.TryUpdateModel(
		  model, "PlacesFieldSettings", null, null))
		{
			builder.WithSetting("PlacesFieldSettings.DisplayOptions",
								model.DisplayOptions.ToString());
		}

		yield return DefinitionTemplate(model);
	}
}
