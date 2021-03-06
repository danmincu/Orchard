﻿using System.Collections.Generic;
using System.Linq;
using Orchard.Layouts.Elements;
using Orchard.Layouts.Framework.Display;
using Orchard.Layouts.Framework.Drivers;
using Orchard.Layouts.Helpers;
using Orchard.Layouts.Services;
using Orchard.Layouts.ViewModels;
using Orchard.Services;

namespace Orchard.Layouts.Drivers {
    public class ParagraphElementDriver : ElementDriver<Paragraph> {
        private readonly IElementFilterProcessor _processor;

        public ParagraphElementDriver(IElementFilterProcessor processor) {
            _processor = processor;
        }

        protected override EditorResult OnBuildEditor(Paragraph element, ElementEditorContext context) {
            var viewModel = new ParagraphEditorViewModel {
                Text = element.Content
            };
            var editor = context.ShapeFactory.EditorTemplate(TemplateName: "Elements.Paragraph", Model: viewModel);

            if (context.Updater != null) {
                context.Updater.TryUpdateModel(viewModel, context.Prefix, null, null);
                element.Content = viewModel.Text;
            }

            return Editor(context, editor);
        }

        protected override void OnDisplaying(Paragraph element, ElementDisplayContext context) {
            context.ElementShape.ProcessedContent = _processor.ProcessContent(element.Content, "html", context.GetTokenData());
        }
    }
}