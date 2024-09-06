package io.intino.ime.box.commands.model;

import io.intino.ime.box.ImeBox;
import io.intino.ime.box.commands.Command;
import io.intino.ime.model.Model;

public class CloneModelCommand extends Command<Model> {
	public Model model;
	public String name;
	public String title;

	public CloneModelCommand(ImeBox box) {
		super(box);
	}

	@Override
	public Model execute() {
		return box.modelManager().clone(model, name, title);
	}

}
